use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Bet};
use crate::events::WinningsClaimed;
use crate::errors::BettingError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub bet: Account<'info, Bet>,
    
    #[account(
        constraint = market.key() == bet.market @ BettingError::InvalidMarket
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &mut ctx.accounts.bet;
    
    require!(
        market.is_resolved,
        BettingError::MarketNotResolved
    );
    
    require!(
        !bet.claimed,
        BettingError::AlreadyClaimed
    );
    
    require!(
        bet.outcome == market.winning_outcome,
        BettingError::NotWinner
    );
    
    // Calculate winnings
    // Formula: (user_bet / winning_pool) * total_pool * 0.98 (2% fee)
    let total_pool = market.total_payout_pool;
    let winning_pool = market.winning_pool;
    
    require!(
        winning_pool > 0,
        BettingError::NoWinningPool
    );
    
    // Calculate proportional share of total pool
    let winnings_before_fee = (bet.amount as u128)
        .checked_mul(total_pool as u128)
        .ok_or(BettingError::Overflow)?
        .checked_div(winning_pool as u128)
        .ok_or(BettingError::Overflow)? as u64;
        
    // Apply 2% platform fee
    let platform_fee = winnings_before_fee
        .checked_mul(2)
        .ok_or(BettingError::Overflow)?
        .checked_div(100)
        .ok_or(BettingError::Overflow)?;
        
    let winnings = winnings_before_fee
        .checked_sub(platform_fee)
        .ok_or(BettingError::Underflow)?;
    
    // Transfer winnings from vault
    let market_seeds = &[
        b"market",
        market.game_id.as_bytes(),
        &[market.market_bump],
    ];
    let signer_seeds = &[&market_seeds[..]];
    
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer_seeds,
        ),
        winnings,
    )?;
    
    bet.claimed = true;
    bet.winnings = winnings;
    
    emit!(WinningsClaimed {
        user: ctx.accounts.user.key(),
        market: market.key(),
        amount: winnings,
    });
    
    Ok(())
}
