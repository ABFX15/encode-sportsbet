use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, Bet};
use crate::events::{BetCancelled, Outcome};
use crate::errors::BettingError;

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(
        mut,
        constraint = bet.user == user.key() @ BettingError::Unauthorized
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
}

pub fn handler(ctx: Context<CancelBet>) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let clock = Clock::get()?;
    
    // Can only cancel 1 hour before game starts
    require!(
        clock.unix_timestamp < ctx.accounts.market.start_time - 3600,
        BettingError::TooLateToCanel
    );
    
    require!(
        !ctx.accounts.market.is_resolved,
        BettingError::MarketResolved
    );
    
    let refund_amount = bet.amount;
    
    // Update market pools
    let market = &mut ctx.accounts.market;
    match bet.outcome {
        Outcome::TeamA => {
            market.total_pool_a = market.total_pool_a
                .checked_sub(refund_amount)
                .ok_or(BettingError::Underflow)?;
        }
        Outcome::TeamB => {
            market.total_pool_b = market.total_pool_b
                .checked_sub(refund_amount)
                .ok_or(BettingError::Underflow)?;
        }
        Outcome::Draw => {
            market.total_pool_draw = market.total_pool_draw
                .checked_sub(refund_amount)
                .ok_or(BettingError::Underflow)?;
        }
        _ => return Err(BettingError::InvalidOutcome.into()),
    }
    
    // Transfer back to user
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
                authority: market.to_account_info(),
            },
            signer_seeds,
        ),
        refund_amount,
    )?;
    
    // Mark bet as cancelled
    bet.amount = 0;
    bet.claimed = true; // Prevent further actions
    
    emit!(BetCancelled {
        user: ctx.accounts.user.key(),
        market: market.key(),
        refund: refund_amount,
    });
    
    Ok(())
}
