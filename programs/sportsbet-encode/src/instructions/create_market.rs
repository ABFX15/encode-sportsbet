use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::Market;
use crate::events::{MarketCreated, Outcome};

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
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

pub fn handler(
    ctx: Context<CreateMarket>,
    game_id: String,
    team_a: String,
    team_b: String,
    start_time: i64,
    oracle_feed: Pubkey,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    
    market.authority = ctx.accounts.authority.key();
    market.game_id = game_id.clone();
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
    market.resolved_at = 0;
    market.total_payout_pool = 0;
    market.winning_pool = 0;
    
    emit!(MarketCreated {
        market: market.key(),
        game_id,
        start_time
    });
    
    Ok(())
}
