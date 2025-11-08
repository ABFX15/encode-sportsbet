use anchor_lang::prelude::*;

declare_id!("BETzK8B5NqJbNKrpNKNmVVqmVVqmVVqmVVqmVVqmVVqm");

pub mod errors;
pub mod events;
pub mod state;
pub mod instructions;

use errors::*;
use events::*;
use instructions::*;

#[program]
pub mod sports_betting {
    use super::*;

    /// Initialize a new betting market for a game
    pub fn create_market(
        ctx: Context<CreateMarket>,
        game_id: String,
        team_a: String,
        team_b: String,
        start_time: i64,
        oracle_feed: Pubkey,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, game_id, team_a, team_b, start_time, oracle_feed)
    }

    /// Place a bet on a market
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome: Outcome,
        amount: u64,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, outcome, amount)
    }

    /// Resolve a market with the game outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: Outcome,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, winning_outcome)
    }

    /// Claim winnings from a resolved market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    /// Cancel a bet before game starts (optional feature)
    pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
        instructions::cancel_bet::handler(ctx)
    }
}