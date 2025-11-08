"use client";

import { useWallet } from "@solana/wallet-adapter-react";

export function MyBets() {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-12 text-center">
        <p className="text-gray-400 text-lg">
          Connect your wallet to view your bets
        </p>
      </div>
    );
  }

  // TODO: Fetch actual bets from the blockchain using Gill SDK
  const activeBets: any[] = [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">My Active Bets</h2>

      {activeBets.length === 0 ? (
        <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-12 text-center">
          <p className="text-gray-400 text-lg">
            No active bets. Place your first bet to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeBets.map((bet, index) => (
            <div
              key={index}
              className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    bet.claimed
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {bet.claimed ? "✅ Claimed" : "⏳ Active"}
                </span>
                <span className="text-white font-bold">
                  ${(bet.amount / 1e6).toFixed(2)} USDC
                </span>
              </div>

              <div className="text-gray-400 mb-2">
                Outcome:{" "}
                <span className="text-white font-medium">{bet.outcome}</span>
              </div>

              {!bet.claimed && bet.isResolved && (
                <button className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/50">
                  Claim ${(bet.winnings / 1e6).toFixed(2)} USDC
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
