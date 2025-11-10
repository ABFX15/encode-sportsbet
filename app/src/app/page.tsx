"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GamesList } from "../components/games-list";
import { BetSlip } from "../components/bet-slip";
import { MyBets } from "../components/my-bets";
import { Leaderboard } from "../components/leaderboard";
import type { Game, OutcomeKey } from "@/types/betting";

type Sport = "all" | "nba" | "nfl" | "epl";

export default function Home() {
  const [tab, setTab] = useState<"games" | "bets" | "leaderboard">("games");
  const [sport, setSport] = useState<Sport>("all");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeKey | null>(
    null
  );
  const [betAmount, setBetAmount] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">$</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                  SOLBET
                </span>
              </div>

              {/* Main Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setTab("games")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    tab === "games"
                      ? "bg-zinc-900 text-amber-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`}
                >
                  Sports
                </button>
                <button
                  onClick={() => setTab("bets")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    tab === "bets"
                      ? "bg-zinc-900 text-amber-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`}
                >
                  My Bets
                </button>
                <button
                  onClick={() => setTab("leaderboard")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    tab === "leaderboard"
                      ? "bg-zinc-900 text-amber-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`}
                >
                  Leaderboard
                </button>
              </nav>
            </div>

            <WalletMultiButton className="!bg-gradient-to-r !from-amber-500 !to-amber-600 hover:!from-amber-600 hover:!to-amber-700 !rounded-lg !h-10" />
          </div>
        </div>
      </header>

      {/* Sport Tabs - Only show on games tab */}
      {tab === "games" && (
        <div className="border-b border-zinc-800 bg-black/50 sticky top-[73px] z-40">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              <button
                onClick={() => setSport("all")}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                  sport === "all"
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                All Sports
              </button>
              <button
                onClick={() => setSport("nba")}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  sport === "nba"
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                🏀 NBA
              </button>
              <button
                onClick={() => setSport("nfl")}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  sport === "nfl"
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                🏈 NFL
              </button>
              <button
                onClick={() => setSport("epl")}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  sport === "epl"
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                ⚽ Soccer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {tab === "games" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="min-w-0">
              <GamesList
                sport={sport}
                selectedGame={selectedGame}
                selectedOutcome={selectedOutcome}
                onSelectGame={setSelectedGame}
                onSelectOutcome={setSelectedOutcome}
              />
            </div>
            <div className="lg:sticky lg:top-[145px] h-fit">
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
