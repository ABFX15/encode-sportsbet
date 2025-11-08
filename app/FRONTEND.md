# NOLIMIT - Sports Betting Frontend

A decentralized sports betting platform built with Next.js, Gill SDK, and Anchor on Solana.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Gill SDK** - Modern Solana JavaScript SDK
- **@gillsdk/react** - React hooks for Solana
- **Tailwind CSS** - Styling
- **Solana Wallet Adapter** - Wallet integration (Phantom)
- **TypeScript** - Type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Solana wallet (Phantom recommended)

### Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Configure environment variables in `.env.local`:
```
NEXT_PUBLIC_SOLANA_RPC_URL=devnet
NEXT_PUBLIC_PROGRAM_ID=H8APpZRJWFy5eRgUq7Ar6FngLT27e8oDmvkwhCCjB39L
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

✅ Wallet connection (Phantom)  
✅ Game listing UI  
✅ Bet slip interface  
✅ My Bets view  
✅ Leaderboard  
✅ Responsive dark theme

🚧 Smart contract integration (coming soon)  
🚧 Actual bet placement  
🚧 Real-time market data

## Resources

- [Gill SDK Docs](https://gillsdk.com/docs)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Docs](https://solana.com/docs)
