use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    TeamA,
    TeamB,
    Draw,
}

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub game_id: String,
    pub start_time: i64,
}

#[event]
pub struct BetPlaced {
    pub user: Pubkey,
    pub market: Pubkey,
    pub outcome: Outcome,
    pub amount: u64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_outcome: Outcome,
    pub total_pool: u64,
}

#[event]
pub struct WinningsClaimed {
    pub user: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BetCancelled {
    pub user: Pubkey,
    pub market: Pubkey,
    pub refund: u64,
}
