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

describe("Sports Betting Program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.sportsBetting as Program<SportsBetting>;

  // Test accounts
  const authority = provider.wallet as anchor.Wallet;
  const bettor = Keypair.generate();
  const oracle = Keypair.generate();

  let usdcMint: PublicKey;
  let authorityTokenAccount: PublicKey;
  let bettorTokenAccount: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let betPda: PublicKey;

  const gameId = "NBA-LAL-BOS-20251108";
  const teamA = "Lakers";
  const teamB = "Celtics";
  const startTime = new BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
  const betAmount = new BN(100 * 10 ** 6); // 100 USDC (6 decimals)

  before(async () => {
    // Airdrop SOL to bettor for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      bettor.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Create USDC mock mint
    usdcMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6 // USDC has 6 decimals
    );

    // Create token accounts
    const authorityAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      authority.publicKey
    );
    authorityTokenAccount = authorityAta.address;

    const bettorAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      bettor.publicKey
    );
    bettorTokenAccount = bettorAta.address;

    // Mint USDC to bettor
    await mintTo(
      provider.connection,
      authority.payer,
      usdcMint,
      bettorTokenAccount,
      authority.payer,
      1000 * 10 ** 6 // 1000 USDC
    );

    // Derive PDAs
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(gameId)],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    [betPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        marketPda.toBuffer(),
        bettor.publicKey.toBuffer()
      ],
      program.programId
    );
  });

  describe("Market Creation", () => {
    it("Creates a new betting market", async () => {
      const tx = await program.methods
        .createMarket(
          gameId,
          teamA,
          teamB,
          startTime,
          oracle.publicKey
        )
        .accounts({
          market: marketPda,
          vault: vaultPda,
          authority: authority.publicKey,
          usdcMint: usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Create market signature:", tx);

      // Verify market account
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(marketAccount.gameId, gameId);
      assert.equal(marketAccount.teamA, teamA);
      assert.equal(marketAccount.teamB, teamB);
      assert.equal(marketAccount.startTime.toString(), startTime.toString());
      assert.equal(marketAccount.authority.toString(), authority.publicKey.toString());
      assert.equal(marketAccount.isResolved, false);
      assert.equal(marketAccount.totalPoolTeamA.toString(), "0");
      assert.equal(marketAccount.totalPoolTeamB.toString(), "0");
      assert.equal(marketAccount.totalPoolDraw.toString(), "0");
    });

    it("Fails to create duplicate market", async () => {
      try {
        await program.methods
          .createMarket(
            gameId,
            teamA,
            teamB,
            startTime,
            oracle.publicKey
          )
          .accounts({
            market: marketPda,
            vault: vaultPda,
            authority: authority.publicKey,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed to create duplicate market");
      } catch (err) {
        // Expected to fail
        assert.ok(err);
      }
    });
  });

  describe("Bet Placement", () => {
    it("Places a bet on Team A", async () => {
      const tx = await program.methods
        .placeBet(
          { teamA: {} }, // Outcome enum
          betAmount
        )
        .accounts({
          bet: betPda,
          market: marketPda,
          vault: vaultPda,
          user: bettor.publicKey,
          userTokenAccount: bettorTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([bettor])
        .rpc();

      console.log("Place bet signature:", tx);

      // Verify bet account
      const betAccount = await program.account.bet.fetch(betPda);
      assert.equal(betAccount.bettor.toString(), bettor.publicKey.toString());
      assert.equal(betAccount.market.toString(), marketPda.toString());
      assert.equal(betAccount.amount.toString(), betAmount.toString());
      assert.ok("teamA" in betAccount.outcome);
      assert.equal(betAccount.claimed, false);

      // Verify market pools updated
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(marketAccount.totalPoolTeamA.toString(), betAmount.toString());
    });

    it("Fails to place bet after game starts", async () => {
      // Create a market with past start time
      const pastGameId = "NBA-LAL-BOS-PAST";
      const pastStartTime = new BN(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago

      const [pastMarketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(pastGameId)],
        program.programId
      );

      const [pastVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), pastMarketPda.toBuffer()],
        program.programId
      );

      // Create the past market
      await program.methods
        .createMarket(
          pastGameId,
          teamA,
          teamB,
          pastStartTime,
          oracle.publicKey
        )
        .accounts({
          market: pastMarketPda,
          vault: pastVaultPda,
          authority: authority.publicKey,
          usdcMint: usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Try to place bet
      const [pastBetPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          pastMarketPda.toBuffer(),
          bettor.publicKey.toBuffer()
        ],
        program.programId
      );

      try {
        await program.methods
          .placeBet({ teamA: {} }, betAmount)
          .accounts({
            bet: pastBetPda,
            market: pastMarketPda,
            vault: pastVaultPda,
            bettor: bettor.publicKey,
            bettorTokenAccount: bettorTokenAccount,
            usdcMint: usdcMint,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .signers([bettor])
          .rpc();
        assert.fail("Should have failed - game already started");
      } catch (err) {
        assert.ok(err.toString().includes("GameAlreadyStarted"));
      }
    });
  });

  describe("Market Resolution", () => {
    it("Resolves market with winning outcome", async () => {
      const tx = await program.methods
        .resolveMarket({ teamA: {} })
        .accounts({
          market: marketPda,
          authority: authority.publicKey,
        })
        .rpc();

      console.log("Resolve market signature:", tx);

      // Verify market is resolved
      const marketAccount = await program.account.market.fetch(marketPda);
      assert.equal(marketAccount.isResolved, true);
      assert.ok("teamA" in marketAccount.winningOutcome);
    });

    it("Fails to resolve market twice", async () => {
      try {
        await program.methods
          .resolveMarket({ teamB: {} })
          .accounts({
            market: marketPda,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have failed - market already resolved");
      } catch (err) {
        assert.ok(err.toString().includes("MarketAlreadyResolved"));
      }
    });
  });

  describe("Winnings Claim", () => {
    it("Claims winnings for a winning bet", async () => {
      const bettorBalanceBefore = await provider.connection.getTokenAccountBalance(
        bettorTokenAccount
      );

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          bet: betPda,
          market: marketPda,
          vault: vaultPda,
          bettor: bettor.publicKey,
          bettorTokenAccount: bettorTokenAccount,
          authority: authority.publicKey,
          authorityTokenAccount: authorityTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([bettor])
        .rpc();

      console.log("Claim winnings signature:", tx);

      // Verify bet is marked as claimed
      const betAccount = await program.account.bet.fetch(betPda);
      assert.equal(betAccount.claimed, true);

      // Verify bettor received winnings
      const bettorBalanceAfter = await provider.connection.getTokenAccountBalance(
        bettorTokenAccount
      );
      const balanceDiff = new BN(bettorBalanceAfter.value.amount).sub(
        new BN(bettorBalanceBefore.value.amount)
      );
      assert.ok(balanceDiff.gt(new BN(0)), "Should have received winnings");
    });

    it("Fails to claim winnings twice", async () => {
      try {
        await program.methods
          .claimWinnings()
          .accounts({
            bet: betPda,
            market: marketPda,
            vault: vaultPda,
            bettor: bettor.publicKey,
            bettorTokenAccount: bettorTokenAccount,
            authority: authority.publicKey,
            authorityTokenAccount: authorityTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([bettor])
          .rpc();
        assert.fail("Should have failed - winnings already claimed");
      } catch (err) {
        assert.ok(err.toString().includes("WinningsAlreadyClaimed"));
      }
    });
  });

  describe("Bet Cancellation", () => {
    it("Cancels a bet before game starts", async () => {
      const newGameId = "NBA-MIA-DEN-20251109";
      const newBettor = Keypair.generate();

      // Airdrop SOL to new bettor
      const airdropSig = await provider.connection.requestAirdrop(
        newBettor.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create token account for new bettor
      const newBettorAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        authority.payer,
        usdcMint,
        newBettor.publicKey
      );

      // Mint tokens to new bettor
      await mintTo(
        provider.connection,
        authority.payer,
        usdcMint,
        newBettorAta.address,
        authority.payer,
        500 * 10 ** 6
      );

      // Create new market
      const [newMarketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(newGameId)],
        program.programId
      );

      const [newVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), newMarketPda.toBuffer()],
        program.programId
      );

      await program.methods
        .createMarket(
          newGameId,
          "Heat",
          "Nuggets",
          new BN(Math.floor(Date.now() / 1000) + 7200), // 2 hours from now
          oracle.publicKey
        )
        .accounts({
          market: newMarketPda,
          vault: newVaultPda,
          authority: authority.publicKey,
          usdcMint: usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      // Place bet
      const [newBetPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          newMarketPda.toBuffer(),
          newBettor.publicKey.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .placeBet({ teamB: {} }, betAmount)
        .accounts({
          bet: newBetPda,
          market: newMarketPda,
          vault: newVaultPda,
          bettor: newBettor.publicKey,
          bettorTokenAccount: newBettorAta.address,
          usdcMint: usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([newBettor])
        .rpc();

      // Cancel bet
      const balanceBefore = await provider.connection.getTokenAccountBalance(
        newBettorAta.address
      );

      const tx = await program.methods
        .cancelBet()
        .accounts({
          bet: newBetPda,
          market: newMarketPda,
          vault: newVaultPda,
          bettor: newBettor.publicKey,
          bettorTokenAccount: newBettorAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([newBettor])
        .rpc();

      console.log("Cancel bet signature:", tx);

      // Verify refund
      const balanceAfter = await provider.connection.getTokenAccountBalance(
        newBettorAta.address
      );
      const refundAmount = new BN(balanceAfter.value.amount).sub(
        new BN(balanceBefore.value.amount)
      );
      assert.equal(refundAmount.toString(), betAmount.toString());
    });
  });
});
