use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BETzK8B5NqJbNKrpNKNmVVqmVVqmVVqmVVqmVVqmVVqm");

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
        let market = &mut ctx.accounts.market;
        
        market.authority = ctx.accounts.authority.key();
        market.game_id = game_id;
        market.team_a = team_a;
        market.team_b = team_b;
        market.start_time = start_time;
        market.oracle_feed = oracle_feed;
        market.total_pool_a = 0;
        market.total_pool_b = 0;
        market.total_pool_draw = 0;
        market.is_resolved = false;
        market.winning_outcome = Outcome::Pending;
        market.market_bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;
        
        emit!(MarketCreated {
            market: market.key(),
            game_id: market.game_id.clone(),
            start_time
        });
        
        Ok(())
    }

    /// Place a bet on a market
    pub fn place_bet(
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

    /// Resolve a market with the game outcome
    pub fn resolve_market(
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

    /// Claim winnings from a resolved market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
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

    /// Cancel a bet before game starts (optional feature)
    pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
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
}

// Account structures
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

// Contexts
#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 64 + 64 + 64 + 8 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"market", game_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"vault", market.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub usdc_mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1,
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

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.authority == resolver.key() @ BettingError::Unauthorized
    )]
    pub market: Account<'info, Market>,
    
    pub resolver: Signer<'info>,
}

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

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    TeamA,
    TeamB,
    Draw,
}

// Events
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

// Errors
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