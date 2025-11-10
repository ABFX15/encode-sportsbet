"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import type { Game, OutcomeKey } from "@/types/betting";
import {
  USDC_DECIMALS,
  FEE_PERCENTAGE,
  PROGRAM_ID,
  USDC_MINT,
} from "@/lib/constants";
import {
  getMarketPDA,
  getBetPDA,
  getVaultPDA,
  outcomeToContract,
  IDL,
} from "@/lib/program";
import { address } from "gill";

interface BetSlipProps {
  selectedGame: Game | null;
  selectedOutcome: OutcomeKey | null;
  betAmount: string;
  onBetAmountChange: (amount: string) => void;
  onBetPlaced: () => void;
}

export function BetSlip({
  selectedGame,
  selectedOutcome,
  betAmount,
  onBetAmountChange,
  onBetPlaced,
}: BetSlipProps) {
  const { publicKey, connected, signTransaction, sendTransaction } =
    useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePotentialWin = () => {
    if (!selectedGame || !selectedOutcome || !betAmount) {
      return "0.00";
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return "0.00";

    // Simple multiplier calculation based on odds
    let multiplier = 1;
    if (selectedOutcome === "teamA") {
      multiplier = selectedGame.odds.teamA;
    } else if (selectedOutcome === "teamB") {
      multiplier = selectedGame.odds.teamB;
    } else if (selectedOutcome === "draw" && selectedGame.odds.draw) {
      multiplier = selectedGame.odds.draw;
    }

    const winnings = amount * multiplier * FEE_PERCENTAGE;
    return winnings.toFixed(2);
  };

  const handlePlaceBet = async () => {
    if (!connected || !publicKey || !sendTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    if (!selectedGame || !selectedOutcome || !betAmount) {
      setError("Please select a game, outcome, and enter an amount");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Starting bet placement...");

      // Convert bet amount to lamports (USDC has 6 decimals)
      const amountLamports = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

      // Get PDAs
      const marketPda = await getMarketPDA(selectedGame.id);
      const vaultPda = await getVaultPDA(marketPda);
      const betPda = await getBetPDA(marketPda, address(publicKey.toString()));

      console.log("PDAs derived:", {
        market: marketPda.toString(),
        vault: vaultPda.toString(),
        bet: betPda.toString(),
      });

      // Get user's USDC token account
      const userTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT.toString()),
        publicKey
      );

      console.log("User token account:", userTokenAccount.toString());

      // Create the instruction data
      // For Anchor, we need to serialize the instruction properly
      // This is a simplified version - you may need to use Anchor's BorshInstructionCoder

      const outcomeData = outcomeToContract(selectedOutcome);

      // Build instruction using Anchor format
      const discriminator = Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]); // place_bet discriminator from IDL

      // Serialize outcome enum (1 byte for variant + data)
      let outcomeBuffer: Buffer;
      if ("teamA" in outcomeData) {
        outcomeBuffer = Buffer.from([1]); // TeamA variant
      } else if ("teamB" in outcomeData) {
        outcomeBuffer = Buffer.from([2]); // TeamB variant
      } else if ("draw" in outcomeData) {
        outcomeBuffer = Buffer.from([3]); // Draw variant
      } else {
        outcomeBuffer = Buffer.from([0]); // Pending variant
      }

      // Serialize amount (u64 - 8 bytes little endian)
      const amountBigInt = BigInt(amountLamports);
      const amountBuffer = new Uint8Array(8);
      const dataView = new DataView(amountBuffer.buffer);
      dataView.setBigUint64(0, amountBigInt, true); // true = little endian

      const data = Buffer.concat([
        discriminator,
        outcomeBuffer,
        Buffer.from(amountBuffer),
      ]);

      // Create the instruction
      const instruction = {
        programId: new PublicKey(PROGRAM_ID.toString()),
        keys: [
          {
            pubkey: new PublicKey(betPda.toString()),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: new PublicKey(marketPda.toString()),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: new PublicKey(vaultPda.toString()),
            isSigner: false,
            isWritable: true,
          },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        data,
      };

      console.log("Instruction created, building transaction...");

      // Create transaction
      const transaction = new Transaction().add(instruction);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending transaction...");

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      console.log("Transaction confirmed!");

      alert(`Bet placed successfully! 🎉\nTransaction: ${signature}`);
      onBetPlaced();
    } catch (err) {
      console.error("Error placing bet:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      alert(`Failed to place bet: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100, 500];

  if (!selectedGame) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-[145px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Bet Slip</h3>
          <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded">
            Empty
          </span>
        </div>
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">
            Select an outcome to start betting
          </p>
        </div>
      </div>
    );
  }

  const outcomeLabel =
    selectedOutcome === "teamA"
      ? selectedGame.teamA
      : selectedOutcome === "teamB"
      ? selectedGame.teamB
      : "Draw";

  const potentialWin = calculatePotentialWin();

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 sticky top-[145px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Bet Slip</h3>
        <button
          onClick={onBetPlaced}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Selected Bet */}
        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-zinc-500 uppercase mb-1">
                {selectedGame.sport}
              </p>
              <p className="text-sm font-medium text-white mb-1">
                {selectedGame.teamA} vs {selectedGame.teamB}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Your pick</span>
            <span className="text-sm font-bold text-amber-400">
              {outcomeLabel}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Bet Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => onBetAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
              USDC
            </span>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => onBetAmountChange(amount.toString())}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Potential Win */}
        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-500">Potential Win</span>
            <span className="text-lg font-bold text-white">
              ${potentialWin}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600">Platform Fee (2%)</span>
            <span className="text-zinc-500">
              ${(parseFloat(potentialWin) * 0.02).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-400"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        {connected ? (
          <button
            onClick={handlePlaceBet}
            disabled={loading || !betAmount || parseFloat(betAmount) <= 0}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Placing Bet..." : "Place Bet"}
          </button>
        ) : (
          <div className="w-full py-3 px-4 bg-zinc-800 text-zinc-500 text-center font-medium rounded-lg">
            Connect wallet to place bets
          </div>
        )}

        {/* Info */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p>
              Bets are locked when the game starts. You can cancel within 1 hour
              of game time for a full refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
