use anchor_lang::prelude::*;
use crate::state::Market;
use crate::events::{MarketResolved, Outcome};
use crate::errors::BettingError;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.authority == resolver.key() @ BettingError::Unauthorized
    )]
    pub market: Account<'info, Market>,
    
    pub resolver: Signer<'info>,
}

pub fn handler(
    ctx: Context<ResolveMarket>,
    winning_outcome: Outcome,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    
    // Only resolve after game start time + buffer (e.g., 3 hours for game completion)
    require!(
        clock.unix_timestamp > market.start_time + 10800, // 3 hours
        BettingError::GameNotComplete
    );
    
    require!(
        !market.is_resolved,
        BettingError::AlreadyResolved
    );
    
    require!(
        winning_outcome != Outcome::Pending,
        BettingError::InvalidOutcome
    );
    
    // TODO: In production, verify outcome from oracle
    // For now, we'll trust the resolver (could be a DAO or oracle integration)
    
    market.is_resolved = true;
    market.winning_outcome = winning_outcome.clone();
    market.resolved_at = clock.unix_timestamp;
    
    // Calculate total losing pool for fee calculation
    let total_pool = market.total_pool_a + market.total_pool_b + market.total_pool_draw;
    let winning_pool = match winning_outcome {
        Outcome::TeamA => market.total_pool_a,
        Outcome::TeamB => market.total_pool_b,
        Outcome::Draw => market.total_pool_draw,
        _ => 0,
    };
    
    market.total_payout_pool = total_pool;
    market.winning_pool = winning_pool;
    
    emit!(MarketResolved {
        market: market.key(),
        winning_outcome,
        total_pool,
    });
    
    Ok(())
}
