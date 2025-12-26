# Property Tycoon Frontend

Next.js frontend for Property Tycoon game. Connect wallet. Buy tokens. Mint properties. Earn yield. Trade properties. Complete quests. Real-time updates powered by Mantle Network and Socket.io.

## What This Frontend Does

You connect your wallet. You buy TYCOON tokens. You mint property NFTs. You claim yield. You trade properties. You complete quests. You view leaderboard. Portfolio updates instantly without refreshing. Yield accumulates in real time. Leaderboard updates live. Properties appear as they are minted. All powered by Mantle Network.

## Prerequisites

Install Node.js 18 or higher. Install npm or yarn. Have a wallet extension ready. Configure Mantle Testnet in your wallet.

## Installation

Navigate to frontend directory:

```bash
cd property-tycoon-mantle/frontend
```

Install dependencies:

```bash
npm install
```

Create `.env.local` file:

```env
# Contract Addresses (Mantle Testnet)
NEXT_PUBLIC_PROPERTY_NFT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_GAME_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS=0x0000000000000000000000000000000000000000

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Network Configuration
NEXT_PUBLIC_MANTLE_NETWORK=testnet
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Note:** Contract addresses are also hardcoded in source files as a fallback, so the app works even without `.env.local`.

## Development

Start development server:

```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Home page
│   │   ├── properties/
│   │   │   ├── page.tsx              # Properties list
│   │   │   └── [id]/page.tsx         # Property detail
│   │   ├── yield/
│   │   │   └── page.tsx              # Yield dashboard
│   │   ├── marketplace/
│   │   │   └── page.tsx              # Marketplace
│   │   ├── quests/
│   │   │   └── page.tsx              # Quests
│   │   ├── leaderboard/
│   │   │   └── page.tsx              # Leaderboard
│   │   └── layout.tsx                # Root layout
│   ├── components/
│   │   ├── wallet/
│   │   │   └── WalletConnect.tsx     # Wallet connection
│   │   ├── properties/
│   │   │   ├── PropertyCard.tsx
│   │   │   └── MintPropertyForm.tsx
│   │   ├── yield/
│   │   │   ├── YieldDashboard.tsx
│   │   │   └── ClaimYieldButton.tsx
│   │   ├── marketplace/
│   │   │   ├── ListingCard.tsx
│   │   │   └── ListPropertyForm.tsx
│   │   ├── quests/
│   │   │   ├── QuestCard.tsx
│   │   │   └── QuestProgress.tsx
│   │   ├── leaderboard/
│   │   │   └── LeaderboardTable.tsx
│   │   └── game/
│   │       ├── GameCanvas.tsx        # Pixi.js visualization
│   │       └── PropertySprite.tsx
│   ├── lib/
│   │   ├── mantle-viem.ts           # Mantle Viem config
│   │   └── contracts.ts             # Contract interactions
│   ├── store/
│   │   └── game-store.ts            # Zustand state management
│   └── hooks/
│       └── useSocket.ts              # Socket.io hooks
├── public/
├── package.json
├── next.config.ts
└── README.md
```

## Contract Addresses

Current deployed contracts on Mantle Testnet:

Property NFT: 0x0000000000000000000000000000000000000000

Game Token: 0x0000000000000000000000000000000000000000

Yield Distributor: 0x0000000000000000000000000000000000000000

Marketplace: 0x0000000000000000000000000000000000000000

Quest System: 0x0000000000000000000000000000000000000000

Update these in source files if contracts are redeployed.

## Mantle Viem Integration

Frontend uses Mantle Viem for Web3 integration. Type-safe contract calls. Mantle network configuration. Optimized RPC calls. Wallet connection via Wagmi.

### Features

Wallet connection with MetaMask and WalletConnect.

Mantle network detection and switching.

Type-safe contract interactions.

Real-time balance updates.

Transaction status tracking.

## Real-Time Updates

Socket.io handles real-time updates. Portfolio values update instantly. Yield accumulates in real time. Leaderboard updates live. Property minting appears immediately. Marketplace trades update instantly. No polling. No refresh needed.

### Implementation

Socket.io client connects to backend. Subscribes to property events. Subscribes to yield events. Subscribes to marketplace events. Subscribes to leaderboard events. Updates UI automatically when events occur.

## Contract Interactions

Frontend uses Wagmi hooks for contract calls. Mint properties. Claim yield. Trade properties. Complete quests. All transactions handled securely.

## Game Visualization

Pixi.js renders property map. Properties displayed as sprites. Player avatars shown. Neighborhood visualization. Real-time updates on map. Interactive property cards.

## Getting Started

1. Install dependencies: `npm install`

2. Set up environment variables in `.env.local`

3. Start development server: `npm run dev`

4. Connect wallet and switch to Mantle Testnet

5. Buy TYCOON tokens and mint your first property

6. Start earning yield and building your portfolio
