use anchor_lang::prelude::*;
use crate::events::Outcome;

#[account]
pub struct Bet {
    pub user: Pubkey,
    pub market: Pubkey,
    pub outcome: Outcome,
    pub amount: u64,
    pub claimed: bool,
    pub winnings: u64,
    pub bet_bump: u8,
}

impl Bet {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        32 + // market
        1 + // outcome
        8 + // amount
        1 + // claimed
        8 + // winnings
        1; // bet_bump
}
