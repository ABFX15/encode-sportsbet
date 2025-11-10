import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SportsBetting } from "../target/types/sports_betting";
import {
    PublicKey,
    Keypair,
    SystemProgram
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    createMint,
} from "@solana/spl-token";
import { assert } from "chai";

describe("Sports Betting - Basic Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.sportsBetting as Program<SportsBetting>;

    const authority = provider.wallet as anchor.Wallet;
    const bettor = Keypair.generate();
    const oracle = Keypair.generate();

    let usdcMint: PublicKey;
    let bettorTokenAccount: PublicKey;

    const gameId = "TEST-GAME-001";
    const teamA = "Team A";
    const teamB = "Team B";
    const startTime = new BN(Math.floor(Date.now() / 1000) + 7200); // 2 hours from now
    const betAmount = new BN(100_000_000); // 100 USDC

    before(async () => {
        console.log("Setting up test environment...");

        // Airdrop SOL to bettor
        const sig = await provider.connection.requestAirdrop(
            bettor.publicKey,
            2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sig);
        console.log("✓ Airdropped SOL to bettor");

        // Create USDC mint
        usdcMint = await createMint(
            provider.connection,
            authority.payer,
            authority.publicKey,
            null,
            6
        );
        console.log("✓ Created USDC mint:", usdcMint.toString());

        // Create and fund bettor token account
        const bettorAta = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            authority.payer,
            usdcMint,
            bettor.publicKey
        );
        bettorTokenAccount = bettorAta.address;

        await mintTo(
            provider.connection,
            authority.payer,
            usdcMint,
            bettorTokenAccount,
            authority.payer,
            1_000_000_000 // 1000 USDC
        );
        console.log("✓ Funded bettor with 1000 USDC");
    });

    it("Creates a betting market", async () => {
        console.log("\n=== Test: Create Market ===");

        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(gameId)],
            program.programId
        );

        const tx = await program.methods
            .createMarket(
                gameId,
                teamA,
                teamB,
                startTime,
                oracle.publicKey
            )
            .rpc();

        console.log("Transaction signature:", tx);

        // Fetch and verify market
        const market = await program.account.market.fetch(marketPda);
        console.log("Market created:");
        console.log("  Game ID:", market.gameId);
        console.log("  Team A:", market.teamA);
        console.log("  Team B:", market.teamB);
        console.log("  Total Pool A:", market.totalPoolA.toString());
        console.log("  Total Pool B:", market.totalPoolB.toString());
        console.log("  Is Resolved:", market.isResolved);

        assert.equal(market.gameId, gameId);
        assert.equal(market.teamA, teamA);
        assert.equal(market.teamB, teamB);
        assert.equal(market.isResolved, false);
    });

    it("Places a bet on the market", async () => {
        console.log("\n=== Test: Place Bet ===");

        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(gameId)],
            program.programId
        );

        const [betPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("bet"),
                marketPda.toBuffer(),
                bettor.publicKey.toBuffer()
            ],
            program.programId
        );

        const tx = await program.methods
            .placeBet(
                { teamA: {} }, // Bet on Team A
                betAmount
            )
            .accounts({
                user: bettor.publicKey,
                userTokenAccount: bettorTokenAccount,
            })
            .signers([bettor])
            .rpc();

        console.log("Transaction signature:", tx);

        // Fetch and verify bet
        const bet = await program.account.bet.fetch(betPda);
        console.log("Bet placed:");
        console.log("  User:", bet.user.toString());
        console.log("  Amount:", bet.amount.toString());
        console.log("  Outcome:", Object.keys(bet.outcome)[0]);
        console.log("  Claimed:", bet.claimed);

        assert.equal(bet.user.toString(), bettor.publicKey.toString());
        assert.equal(bet.amount.toString(), betAmount.toString());
        assert.ok("teamA" in bet.outcome);
        assert.equal(bet.claimed, false);

        // Verify market pool updated
        const market = await program.account.market.fetch(marketPda);
        console.log("  Market Pool A updated to:", market.totalPoolA.toString());
        assert.equal(market.totalPoolA.toString(), betAmount.toString());
    });

    it("Resolves the market", async () => {
        console.log("\n=== Test: Resolve Market ===");

        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(gameId)],
            program.programId
        );

        const tx = await program.methods
            .resolveMarket({ teamA: {} })
            .accounts({
                market: marketPda,
                resolver: authority.publicKey,
            })
            .rpc();

        console.log("Transaction signature:", tx);

        // Verify market is resolved
        const market = await program.account.market.fetch(marketPda);
        console.log("Market resolved:");
        console.log("  Is Resolved:", market.isResolved);
        console.log("  Winning Outcome:", Object.keys(market.winningOutcome)[0]);

        assert.equal(market.isResolved, true);
        assert.ok("teamA" in market.winningOutcome);
    });

    it("Claims winnings from a winning bet", async () => {
        console.log("\n=== Test: Claim Winnings ===");

        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(gameId)],
            program.programId
        );

        const [betPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("bet"),
                marketPda.toBuffer(),
                bettor.publicKey.toBuffer()
            ],
            program.programId
        );

        const balanceBefore = await provider.connection.getTokenAccountBalance(
            bettorTokenAccount
        );
        console.log("Balance before claim:", balanceBefore.value.amount);

        const tx = await program.methods
            .claimWinnings()
            .accounts({
                user: bettor.publicKey,
                userTokenAccount: bettorTokenAccount,
            })
            .signers([bettor])
            .rpc();

        console.log("Transaction signature:", tx);

        // Verify bet is claimed
        const bet = await program.account.bet.fetch(betPda);
        console.log("Winnings claimed:");
        console.log("  Claimed:", bet.claimed);
        console.log("  Winnings amount:", bet.winnings.toString());

        assert.equal(bet.claimed, true);

        // Verify bettor received tokens
        const balanceAfter = await provider.connection.getTokenAccountBalance(
            bettorTokenAccount
        );
        console.log("Balance after claim:", balanceAfter.value.amount);

        const balanceDiff = new BN(balanceAfter.value.amount).sub(
            new BN(balanceBefore.value.amount)
        );
        console.log("Balance difference:", balanceDiff.toString());
        assert.ok(balanceDiff.gt(new BN(0)), "Should have received winnings");
    });

    it("Cancels a bet before game starts", async () => {
        console.log("\n=== Test: Cancel Bet ===");

        // Create a new market for this test
        const newGameId = "TEST-GAME-002";
        const [newMarketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(newGameId)],
            program.programId
        );

        // Create market
        await program.methods
            .createMarket(
                newGameId,
                "Team C",
                "Team D",
                new BN(Math.floor(Date.now() / 1000) + 10800), // 3 hours from now
                oracle.publicKey
            )
            .rpc();

        console.log("Created new market for cancel test");

        // Place bet
        const [betPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("bet"),
                newMarketPda.toBuffer(),
                bettor.publicKey.toBuffer()
            ],
            program.programId
        );

        await program.methods
            .placeBet({ teamB: {} }, betAmount)
            .accounts({
                user: bettor.publicKey,
                userTokenAccount: bettorTokenAccount,
            })
            .signers([bettor])
            .rpc();

        console.log("Placed bet to be cancelled");

        // Get balance before cancel
        const balanceBefore = await provider.connection.getTokenAccountBalance(
            bettorTokenAccount
        );

        // Cancel bet
        const tx = await program.methods
            .cancelBet()
            .accounts({
                user: bettor.publicKey,
                userTokenAccount: bettorTokenAccount,
            })
            .signers([bettor])
            .rpc();

        console.log("Transaction signature:", tx);

        // Verify refund
        const balanceAfter = await provider.connection.getTokenAccountBalance(
            bettorTokenAccount
        );

        const refundAmount = new BN(balanceAfter.value.amount).sub(
            new BN(balanceBefore.value.amount)
        );

        console.log("Refund amount:", refundAmount.toString());
        assert.equal(refundAmount.toString(), betAmount.toString(), "Should receive full refund");
    });
});
