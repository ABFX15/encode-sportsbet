"use client";

import { useEffect, useState } from "react";
import { useSolanaClient } from "@gillsdk/react";
import { UPCOMING_GAMES } from "@/lib/games-data";
import type { Game, Market, OutcomeKey } from "@/types/betting";
import { PROGRAM_ID } from "@/lib/constants";
import { address, getProgramDerivedAddress } from "gill";

interface GamesListProps {
  selectedGame: Game | null;
  selectedOutcome: OutcomeKey | null;
  onSelectGame: (game: Game) => void;
  onSelectOutcome: (outcome: OutcomeKey) => void;
}

export function GamesList({
  selectedGame,
  selectedOutcome,
  onSelectGame,
  onSelectOutcome,
}: GamesListProps) {
  const { rpc } = useSolanaClient();
  const [markets, setMarkets] = useState<Record<string, Market | null>>({});

  useEffect(() => {
    const fetchMarkets = async () => {
      const marketData: Record<string, Market | null> = {};

      for (const game of UPCOMING_GAMES) {
        try {
          const [marketPda] = await getProgramDerivedAddress({
            programAddress: PROGRAM_ID,
            seeds: [
              "market",
              Buffer.from(game.id),
            ],
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
  }, [rpc]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Upcoming Games</h2>

      {UPCOMING_GAMES.map((game) => {
        const market = markets[game.id];
        const totalPool = market
          ? (Number(market.totalPoolA) +
              Number(market.totalPoolB) +
              Number(market.totalPoolDraw)) /
            1e6
          : 0;

        return (
          <div
            key={game.id}
            className={`bg-black/40 backdrop-blur-sm rounded-lg border p-6 cursor-pointer transition-all ${
              selectedGame?.id === game.id
                ? "border-purple-500 shadow-lg shadow-purple-500/20"
                : "border-purple-500/20 hover:border-purple-500/40"
            }`}
            onClick={() => onSelectGame(game)}
          >
            {/* Game Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                {game.sport}
              </span>
              <span className="text-gray-400 text-sm">
                {new Date(game.startTime).toLocaleDateString()}{" "}
                {new Date(game.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-white">
                {game.teamA}
              </div>
              <div className="text-gray-500 font-bold">VS</div>
              <div className="text-lg font-semibold text-white">
                {game.teamB}
              </div>
            </div>

            {/* Pool Info */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-gray-400">Total Pool:</span>
              <span className="text-green-400 font-medium">
                ${totalPool.toFixed(2)} USDC
              </span>
            </div>

            {/* Outcome Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`py-3 px-4 rounded-lg border transition-all ${
                  selectedGame?.id === game.id &&
                  selectedOutcome === "teamA"
                    ? "border-green-500 bg-green-500/20 text-white"
                    : "border-purple-500/30 bg-purple-500/10 text-gray-300 hover:border-purple-500/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame(game);
                  onSelectOutcome("teamA");
                }}
              >
                <div className="text-xs mb-1">
                  {game.teamA.split(" ").slice(-1)[0]}
                </div>
                <div className="text-sm font-bold">
                  {market
                    ? `${(Number(market.totalPoolA) / 1e6 || 0).toFixed(
                        0
                      )} USDC`
                    : `${game.odds.teamA}x`}
                </div>
              </button>

              {game.odds.draw && (
                <button
                  className={`py-3 px-4 rounded-lg border transition-all ${
                    selectedGame?.id === game.id &&
                    selectedOutcome === "draw"
                      ? "border-green-500 bg-green-500/20 text-white"
                      : "border-purple-500/30 bg-purple-500/10 text-gray-300 hover:border-purple-500/50"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGame(game);
                    onSelectOutcome("draw");
                  }}
                >
                  <div className="text-xs mb-1">Draw</div>
                  <div className="text-sm font-bold">
                    {market
                      ? `${(Number(market.totalPoolDraw) / 1e6 || 0).toFixed(
                          0
                        )} USDC`
                      : `${game.odds.draw}x`}
                  </div>
                </button>
              )}

              <button
                className={`py-3 px-4 rounded-lg border transition-all ${
                  selectedGame?.id === game.id &&
                  selectedOutcome === "teamB"
                    ? "border-green-500 bg-green-500/20 text-white"
                    : "border-purple-500/30 bg-purple-500/10 text-gray-300 hover:border-purple-500/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame(game);
                  onSelectOutcome("teamB");
                }}
              >
                <div className="text-xs mb-1">
                  {game.teamB.split(" ").slice(-1)[0]}
                </div>
                <div className="text-sm font-bold">
                  {market
                    ? `${(Number(market.totalPoolB) / 1e6 || 0).toFixed(
                        0
                      )} USDC`
                    : `${game.odds.teamB}x`}
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
