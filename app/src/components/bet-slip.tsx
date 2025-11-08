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
      
      alert("Bet placement coming soon! Integration with smart contract in progress.");
      onBetPlaced();
    } catch (err) {
      console.error("Error placing bet:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedGame) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-6 h-fit sticky top-8">
        <h3 className="text-xl font-bold text-white mb-4">Bet Slip</h3>
        <p className="text-gray-400 text-center py-8">
          Select a game and outcome to place a bet
        </p>
      </div>
    );
  }

  const outcomeLabel =
    selectedOutcome === "teamA"
      ? selectedGame.teamA
      : selectedOutcome === "teamB"
      ? selectedGame.teamB
      : "Draw";

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-6 h-fit sticky top-8">
      <h3 className="text-xl font-bold text-white mb-4">Bet Slip</h3>

      <div className="space-y-4">
        {/* Game Info */}
        <div className="pb-4 border-b border-purple-500/20">
          <div className="text-sm text-gray-400 mb-1">Game</div>
          <div className="text-white font-medium">
            {selectedGame.teamA} vs {selectedGame.teamB}
          </div>
        </div>

        {/* Selection */}
        <div className="pb-4 border-b border-purple-500/20">
          <div className="text-sm text-gray-400 mb-1">Selection</div>
          <div className="text-white font-medium">
            {selectedOutcome ? outcomeLabel : "Not selected"}
          </div>
        </div>

        {/* Bet Amount Input */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Bet Amount (USDC)
          </label>
          <input
            type="number"
            placeholder="0.00"
            value={betAmount}
            onChange={(e) => onBetAmountChange(e.target.value)}
            min="1"
            step="1"
            className="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Potential Win */}
        <div className="pb-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Potential Win</span>
            <span className="text-green-400 font-bold text-lg">
              ${calculatePotentialWin()} USDC
            </span>
          </div>
        </div>

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={loading || !connected || !selectedOutcome || !betAmount}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            loading || !connected || !selectedOutcome || !betAmount
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/50"
          }`}
        >
          {loading
            ? "Processing..."
            : !connected
            ? "Connect Wallet"
            : "Place Bet"}
        </button>

        {/* Fee Info */}
        <p className="text-xs text-gray-500 text-center">
          2% platform fee applied to winnings
        </p>
      </div>
    </div>
  );
}
