use anchor_lang::prelude::*;
use crate::events::Outcome;

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub game_id: String,
    pub team_a: String,
    pub team_b: String,
    pub start_time: i64,
    pub oracle_feed: Pubkey,
    pub total_pool_a: u64,
    pub total_pool_b: u64,
    pub total_pool_draw: u64,
    pub is_resolved: bool,
    pub winning_outcome: Outcome,
    pub resolved_at: i64,
    pub total_payout_pool: u64,
    pub winning_pool: u64,
    pub market_bump: u8,
    pub vault_bump: u8,
}

impl Market {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        64 + // game_id (4 + 60 max string)
        64 + // team_a (4 + 60 max string)
        64 + // team_b (4 + 60 max string)
        8 + // start_time
        32 + // oracle_feed
        8 + // total_pool_a
        8 + // total_pool_b
        8 + // total_pool_draw
        1 + // is_resolved
        1 + // winning_outcome
        8 + // resolved_at
        8 + // total_payout_pool
        8 + // winning_pool
        1 + // market_bump
        1; // vault_bump
}
