# Sports Betting Program - Modular Structure

This Anchor program has been organized into a clean, modular structure for better maintainability and scalability.

## 📁 Project Structure

```
programs/sportsbet-encode/src/
├── lib.rs              # Main entry point
├── errors.rs           # Error definitions
├── events.rs           # Event definitions and Outcome enum
├── state/              # Account state definitions
│   ├── mod.rs
│   ├── market.rs       # Market account structure
│   └── bet.rs          # Bet account structure
└── instructions/       # Instruction handlers
    ├── mod.rs
    ├── create_market.rs
    ├── place_bet.rs
    ├── resolve_market.rs
    ├── claim_winnings.rs
    └── cancel_bet.rs
```

## 📝 Module Descriptions

### `lib.rs`
Main program entry point that:
- Declares the program ID
- Imports all modules
- Defines the `#[program]` module with instruction wrappers
- Delegates to instruction handlers

### `errors.rs`
Contains all custom error definitions:
- `BettingError` enum with descriptive error messages
- Used across all instructions for error handling

### `events.rs`
Defines:
- `Outcome` enum (Pending, TeamA, TeamB, Draw)
- All program events:
  - `MarketCreated`
  - `BetPlaced`
  - `MarketResolved`
  - `WinningsClaimed`
  - `BetCancelled`

### `state/`
Account structures with proper sizing:

#### `market.rs`
- `Market` account structure
- Stores game information, pools, and resolution data
- Includes `LEN` constant for space calculation

#### `bet.rs`
- `Bet` account structure
- Stores user bet information
- Includes `LEN` constant for space calculation

### `instructions/`
Each instruction has its own file with:
- Account validation context (`#[derive(Accounts)]`)
- Handler function with business logic
- Proper error handling

#### `create_market.rs`
Creates a new betting market for a game

#### `place_bet.rs`
Allows users to place bets on a market

#### `resolve_market.rs`
Resolves a market with the winning outcome

#### `claim_winnings.rs`
Allows winners to claim their winnings

#### `cancel_bet.rs`
Allows users to cancel bets before game starts

## 🚀 Benefits of This Structure

1. **Separation of Concerns**: Each module has a single responsibility
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Scalability**: Simple to add new instructions or state
4. **Testability**: Individual modules can be tested in isolation
5. **Readability**: Clean imports and organized code

## 🔧 Building

```bash
anchor build
```

## 🧪 Testing

```bash
anchor test
```

## 📦 Adding New Instructions

1. Create new file in `instructions/` directory:
   ```rust
   // instructions/your_instruction.rs
   use anchor_lang::prelude::*;
   use crate::state::*;
   use crate::errors::*;
   
   #[derive(Accounts)]
   pub struct YourInstruction<'info> {
       // ... accounts
   }
   
   pub fn handler(ctx: Context<YourInstruction>) -> Result<()> {
       // ... logic
       Ok(())
   }
   ```

2. Export in `instructions/mod.rs`:
   ```rust
   pub mod your_instruction;
   pub use your_instruction::*;
   ```

3. Add to program in `lib.rs`:
   ```rust
   pub fn your_instruction(ctx: Context<YourInstruction>) -> Result<()> {
       instructions::your_instruction::handler(ctx)
   }
   ```

## 📦 Adding New State

1. Create file in `state/` directory
2. Export in `state/mod.rs`
3. Import in relevant instruction files

## 🎯 Best Practices

- Keep instruction handlers focused and single-purpose
- Use checked arithmetic for all math operations
- Validate all inputs in account contexts
- Emit events for important state changes
- Document all public interfaces
- Use descriptive error messages

## 📚 Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/examples)
