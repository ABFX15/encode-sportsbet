"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Game, OutcomeKey } from "@/types/betting";
import { USDC_DECIMALS, FEE_PERCENTAGE } from "@/lib/constants";

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
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);

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
    if (!connected || !publicKey) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedGame || !selectedOutcome || !betAmount) {
      alert("Please select a game, outcome, and enter an amount");
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual bet placement logic using Gill SDK
      // This would involve:
      // 1. Creating/fetching market PDA
      // 2. Creating bet PDA
      // 3. Transferring USDC to vault
      // 4. Updating market and bet accounts

      alert(
        "Bet placement coming soon! Integration with smart contract in progress."
      );
      onBetPlaced();
    } catch (err) {
      console.error("Error placing bet:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
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
