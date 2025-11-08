use anchor_lang::prelude::*;

#[error_code]
pub enum BettingError {
    #[msg("Market is closed for betting")]
    MarketClosed,
    #[msg("Market already resolved")]
    MarketResolved,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Overflow error")]
    Overflow,
    #[msg("Underflow error")]
    Underflow,
    #[msg("Game not complete")]
    GameNotComplete,
    #[msg("Already resolved")]
    AlreadyResolved,
    #[msg("Market not resolved")]
    MarketNotResolved,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Not a winner")]
    NotWinner,
    #[msg("No winning pool")]
    NoWinningPool,
    #[msg("Too late to cancel")]
    TooLateToCanel,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid market")]
    InvalidMarket,
}
