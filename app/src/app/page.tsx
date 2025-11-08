"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GamesList } from "../components/games-list";
import { BetSlip } from "../components/bet-slip";
import { MyBets } from "../components/my-bets";
import { Leaderboard } from "../components/leaderboard";
import type { Game, OutcomeKey } from "@/types/betting";

export default function Home() {
  const [tab, setTab] = useState<"games" | "bets" | "leaderboard">("games");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeKey | null>(
    null
  );
  const [betAmount, setBetAmount] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-4xl">⚡</span>
            <span className="text-2xl font-bold text-white">NOLIMIT</span>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("games")}
              className={`px-6 py-3 font-medium transition-colors ${
                tab === "games"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Games
            </button>
            <button
              onClick={() => setTab("bets")}
              className={`px-6 py-3 font-medium transition-colors ${
                tab === "bets"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              My Bets
            </button>
            <button
              onClick={() => setTab("leaderboard")}
              className={`px-6 py-3 font-medium transition-colors ${
                tab === "leaderboard"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "games" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <GamesList
                selectedGame={selectedGame}
                selectedOutcome={selectedOutcome}
                onSelectGame={setSelectedGame}
                onSelectOutcome={setSelectedOutcome}
              />
            </div>
            <div className="lg:col-span-1">
              <BetSlip
                selectedGame={selectedGame}
                selectedOutcome={selectedOutcome}
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                onBetPlaced={() => {
                  setSelectedGame(null);
                  setSelectedOutcome(null);
                  setBetAmount("");
                }}
              />
            </div>
          </div>
        )}

        {tab === "bets" && <MyBets />}

        {tab === "leaderboard" && <Leaderboard />}
      </main>
    </div>
  );
}
