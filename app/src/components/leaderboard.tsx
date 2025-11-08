"use client";

// Mock leaderboard data - in production, fetch from the blockchain
const MOCK_LEADERBOARD = [
  {
    rank: "🥇",
    address: "7xKX...9PoW",
    winnings: 12450,
  },
  {
    rank: "🥈",
    address: "9mNp...3KlM",
    winnings: 8320,
  },
  {
    rank: "🥉",
    address: "4pQr...7YtE",
    winnings: 6180,
  },
  {
    rank: "4",
    address: "2vTs...8RmN",
    winnings: 5240,
  },
  {
    rank: "5",
    address: "6hYu...2PqL",
    winnings: 4890,
  },
];

export function Leaderboard() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Top Winners</h2>

      <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-purple-500/20 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b border-purple-500/20 bg-purple-500/10">
          <div className="text-gray-400 text-sm font-medium">Rank</div>
          <div className="text-gray-400 text-sm font-medium">Address</div>
          <div className="text-gray-400 text-sm font-medium text-right">
            Total Winnings
          </div>
        </div>

        {/* Leaderboard Items */}
        {MOCK_LEADERBOARD.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-3 gap-4 p-4 border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-2">{item.rank}</span>
            </div>
            <div className="flex items-center">
              <span className="text-white font-mono">{item.address}</span>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-green-400 font-bold">
                ${item.winnings.toLocaleString()} USDC
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-gray-500 text-sm text-center mt-6">
        Leaderboard updates every 24 hours
      </p>
    </div>
  );
}
