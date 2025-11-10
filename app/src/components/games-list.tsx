"use client";

import { useEffect, useState } from "react";
import { UPCOMING_GAMES } from "@/lib/games-data";
import type { Game, Market, OutcomeKey } from "@/types/betting";
import { PROGRAM_ID } from "@/lib/constants";
import { address, getProgramDerivedAddress } from "gill";

type Sport = "all" | "nba" | "nfl" | "epl";

interface GamesListProps {
  sport: Sport;
  selectedGame: Game | null;
  selectedOutcome: OutcomeKey | null;
  onSelectGame: (game: Game) => void;
  onSelectOutcome: (outcome: OutcomeKey) => void;
}

export function GamesList({
  sport,
  selectedGame,
  selectedOutcome,
  onSelectGame,
  onSelectOutcome,
}: GamesListProps) {
  const [markets, setMarkets] = useState<Record<string, Market | null>>({});

  // Filter games by sport
  const filteredGames =
    sport === "all"
      ? UPCOMING_GAMES
      : UPCOMING_GAMES.filter((game) => game.sport.toLowerCase() === sport);

  useEffect(() => {
    const fetchMarkets = async () => {
      const marketData: Record<string, Market | null> = {};

      for (const game of UPCOMING_GAMES) {
        try {
          const [marketPda] = await getProgramDerivedAddress({
            programAddress: PROGRAM_ID,
            seeds: ["market", Buffer.from(game.id)],
          });

          // Fetch market account data
          // Note: You'll need to implement actual account fetching with proper deserialization
          // For now, setting to null
          marketData[game.id] = null;
        } catch (err) {
          marketData[game.id] = null;
        }
      }

      setMarkets(marketData);
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array since we're not using any external data yet

  return (
    <div className="space-y-3">
      {filteredGames.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No games available for this sport</p>
        </div>
      ) : (
        filteredGames.map((game) => {
          const market = markets[game.id];
          const totalPool = market
            ? (Number(market.totalPoolA) +
                Number(market.totalPoolB) +
                Number(market.totalPoolDraw)) /
              1e6
            : 0;

          const isSelected = selectedGame?.id === game.id;

          return (
            <div
              key={game.id}
              className={`bg-zinc-900 rounded-xl border transition-all hover:border-zinc-700 ${
                isSelected
                  ? "border-amber-500/50 ring-1 ring-amber-500/20"
                  : "border-zinc-800"
              }`}
            >
              {/* Game Header */}
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase">
                    {game.sport}
                  </span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(game.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(game.startTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {totalPool > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs text-zinc-400">
                      ${totalPool.toLocaleString()} pool
                    </span>
                  </div>
                )}
              </div>

              {/* Match Info */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">
                      {game.teamA}
                    </h3>
                  </div>
                  <div className="px-4">
                    <span className="text-xs font-medium text-zinc-600">
                      VS
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="text-base font-semibold text-white">
                      {game.teamB}
                    </h3>
                  </div>
                </div>

                {/* Outcome Buttons */}
                <div
                  className={`grid gap-2 ${
                    game.odds.draw ? "grid-cols-3" : "grid-cols-2"
                  }`}
                >
                  <button
                    className={`group relative overflow-hidden rounded-lg border transition-all ${
                      isSelected && selectedOutcome === "teamA"
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGame(game);
                      onSelectOutcome("teamA");
                    }}
                  >
                    <div className="px-4 py-3 text-center">
                      <div
                        className={`text-xs font-medium mb-1 ${
                          isSelected && selectedOutcome === "teamA"
                            ? "text-amber-400"
                            : "text-zinc-500 group-hover:text-zinc-400"
                        }`}
                      >
                        {game.teamA.split(" ").pop()}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isSelected && selectedOutcome === "teamA"
                            ? "text-amber-400"
                            : "text-white"
                        }`}
                      >
                        {market && Number(market.totalPoolA) > 0
                          ? `${(Number(market.totalPoolA) / 1e6).toFixed(
                              0
                            )} USDC`
                          : `${game.odds.teamA.toFixed(2)}x`}
                      </div>
                    </div>
                  </button>

                  {game.odds.draw && (
                    <button
                      className={`group relative overflow-hidden rounded-lg border transition-all ${
                        isSelected && selectedOutcome === "draw"
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGame(game);
                        onSelectOutcome("draw");
                      }}
                    >
                      <div className="px-4 py-3 text-center">
                        <div
                          className={`text-xs font-medium mb-1 ${
                            isSelected && selectedOutcome === "draw"
                              ? "text-amber-400"
                              : "text-zinc-500 group-hover:text-zinc-400"
                          }`}
                        >
                          Draw
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isSelected && selectedOutcome === "draw"
                              ? "text-amber-400"
                              : "text-white"
                          }`}
                        >
                          {market && Number(market.totalPoolDraw) > 0
                            ? `${(Number(market.totalPoolDraw) / 1e6).toFixed(
                                0
                              )} USDC`
                            : `${game.odds.draw.toFixed(2)}x`}
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    className={`group relative overflow-hidden rounded-lg border transition-all ${
                      isSelected && selectedOutcome === "teamB"
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectGame(game);
                      onSelectOutcome("teamB");
                    }}
                  >
                    <div className="px-4 py-3 text-center">
                      <div
                        className={`text-xs font-medium mb-1 ${
                          isSelected && selectedOutcome === "teamB"
                            ? "text-amber-400"
                            : "text-zinc-500 group-hover:text-zinc-400"
                        }`}
                      >
                        {game.teamB.split(" ").pop()}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isSelected && selectedOutcome === "teamB"
                            ? "text-amber-400"
                            : "text-white"
                        }`}
                      >
                        {market && Number(market.totalPoolB) > 0
                          ? `${(Number(market.totalPoolB) / 1e6).toFixed(
                              0
                            )} USDC`
                          : `${game.odds.teamB.toFixed(2)}x`}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
