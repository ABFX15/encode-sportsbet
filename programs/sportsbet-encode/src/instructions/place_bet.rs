use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Bet};
use crate::events::{BetPlaced, Outcome};
use crate::errors::BettingError;

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = Bet::LEN,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PlaceBet>,
    outcome: Outcome,
    amount: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    
    // Check market is still open (game hasn't started)
    require!(
        clock.unix_timestamp < market.start_time,
        BettingError::MarketClosed
    );
    
    require!(
        !market.is_resolved,
        BettingError::MarketResolved
    );
    
    require!(
        outcome != Outcome::Pending,
        BettingError::InvalidOutcome
    );
    
    // Transfer USDC to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Create or update bet position
    let bet = &mut ctx.accounts.bet;
    bet.user = ctx.accounts.user.key();
    bet.market = market.key();
    bet.outcome = outcome.clone();
    bet.amount = bet.amount.checked_add(amount).ok_or(BettingError::Overflow)?;
    bet.claimed = false;
    bet.bet_bump = ctx.bumps.bet;
    bet.winnings = 0;
    
    // Update market pools
    match outcome {
        Outcome::TeamA => {
            market.total_pool_a = market.total_pool_a
                .checked_add(amount)
                .ok_or(BettingError::Overflow)?;
        }
        Outcome::TeamB => {
            market.total_pool_b = market.total_pool_b
                .checked_add(amount)
                .ok_or(BettingError::Overflow)?;
        }
        Outcome::Draw => {
            market.total_pool_draw = market.total_pool_draw
                .checked_add(amount)
                .ok_or(BettingError::Overflow)?;
        }
        _ => return Err(BettingError::InvalidOutcome.into()),
    }
    
    emit!(BetPlaced {
        user: ctx.accounts.user.key(),
        market: market.key(),
        outcome,
        amount,
    });
    
    Ok(())
}
