# Property Tycoon Frontend

Next.js frontend for Property Tycoon game. Connect wallet. Buy tokens. Mint properties. Earn yield. Trade properties. Complete quests. Real-time updates powered by Mantle Network and Socket.io.

## What This Frontend Does

You connect your wallet. You buy TYCOON tokens. You mint property NFTs. You claim yield. You trade properties. You complete quests. You view leaderboard. Portfolio updates instantly without refreshing. Yield accumulates in real time. Leaderboard updates live. Properties appear as they are minted. All powered by Mantle Network.

## Prerequisites

Install Node.js 18 or higher. Install npm or yarn. Have a wallet extension ready. Configure Mantle Sepolia Testnet in your wallet.

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
# Contract Addresses (Mantle Sepolia Testnet)
NEXT_PUBLIC_PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
NEXT_PUBLIC_GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=0xb950EE50c98cD686DA34C535955203e2CE065F88
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
NEXT_PUBLIC_TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Network Configuration
NEXT_PUBLIC_MANTLE_CHAIN_ID=5003
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz

# Reown AppKit (formerly WalletConnect)
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id_here
```

Get your Project ID from [Reown Cloud](https://cloud.reown.com/). Create a new project, select AppKit, choose Next.js framework, and copy the Project ID.

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
│   │   ├── game/
│   │   │   └── page.tsx              # Main game page
│   │   ├── leaderboard/
│   │   │   └── page.tsx              # Leaderboard
│   │   └── layout.tsx                # Root layout
│   ├── components/
│   │   ├── WalletConnect.tsx         # Wallet connection
│   │   ├── GlobalChat.tsx            # Real-time chat
│   │   ├── UserProfile.tsx           # User profile settings
│   │   ├── Quests.tsx                # Quest system
│   │   ├── Marketplace.tsx           # Property marketplace
│   │   ├── Guilds.tsx                # Guild system
│   │   └── game/
│   │       ├── CityView.tsx          # City map visualization
│   │       ├── PropertyCard.tsx      # Property display
│   │       ├── YieldDisplay.tsx      # Yield dashboard
│   │       └── BuildMenu.tsx         # Property minting
│   ├── hooks/
│   │   └── useChat.ts                # Chat hook with WebSocket
│   ├── lib/
│   │   ├── contracts.ts              # Contract ABIs and addresses
│   │   ├── api.ts                    # Backend API client
│   │   └── mantle-viem.ts           # Mantle Viem configuration
│   └── config/
│       └── wagmi.ts                  # Wagmi configuration
├── public/
│   └── abis/                         # Contract ABIs
├── package.json
├── next.config.ts
└── README.md
```

## Contract Addresses

Current deployed contracts on Mantle Sepolia Testnet:

TYCOON Token: 0x3334f87178AD0f33e61009777a3dFa1756e9c23f

Property NFT: 0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c

Yield Distributor: 0xb950EE50c98cD686DA34C535955203e2CE065F88

Marketplace: 0x6b6b65843117C55da74Ea55C954a329659EFBeF0

Quest System: 0x89f72227168De554A28874aA79Bcb6f0E8e2227C

Token Swap: 0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

Update these in source files if contracts are redeployed.

## Mantle Network Integration

Property Tycoon uses Mantle Network for all blockchain interactions. Frontend leverages Mantle's high throughput and low fees for seamless user experience.

### Features

Real-time portfolio updates without refreshing.

Live yield accumulation tracking.

Instant leaderboard updates via WebSocket.

Property minting with optimized gas costs.

Yield claiming with micro-transaction support.

### Implementation

Mantle Viem Configuration (`src/lib/mantle-viem.ts`):
- Uses Wagmi hooks for contract interactions
- Type-safe contract calls with Viem
- Automatic caching for efficient data fetching
- Real-time event subscriptions for instant updates
- Optimized RPC calls leveraging Mantle's high throughput

Contract Interactions (`src/lib/contracts.ts`):
- Property NFT minting and management
- Yield claiming and distribution
- Marketplace trading
- Quest completion and rewards
- Token swapping (MNT to TYCOON)

WebSocket Integration (`src/hooks/useChat.ts`):
- Real-time chat messaging
- Portfolio update notifications
- Leaderboard position changes
- Yield accumulation updates

### Mantle-Specific Optimizations

- **Low Gas Costs**: Frequent yield claims are affordable on Mantle
- **High Throughput**: Real-time multiplayer interactions supported
- **Fast Finality**: Instant portfolio updates
- **EVM Compatibility**: Seamless integration with existing tooling

## Key Features

### Buy TYCOON Tokens

Purchase TYCOON tokens directly:
- MNT payment available for all wallets
- One MNT equals 100 TYCOON tokens
- Select amount of TYCOON tokens to buy
- See cost calculated automatically
- Quick buttons for common amounts
- Balance updates automatically after purchase

### Mint Property

Choose property type:
- Residential (100 TYCOON) - 5% APY
- Commercial (200 TYCOON) - 8% APY
- Industrial (500 TYCOON) - 12% APY
- Luxury (1000 TYCOON) - 15% APY

Automatic approval flow.

Balance checks prevent insufficient funds.

Property appears on city map instantly.

### Claim Yield

Properties generate yield daily.

Claim yield after 24 hours.

Batch claim all properties at once.

Yield distributed as USDC or USDT.

Real money in your wallet.

### Marketplace

Browse properties for sale.

Buy from other players.

Sell your properties.

Fixed price and auction listings.

View seller information.

### Quests

Complete investment challenges:
- First Property: Mint your first property
- Diversify Portfolio: Own 3 different property types
- Property Mogul: Own 10 properties
- RWA Pioneer: Link 5 properties to RWA

Earn bonus TYCOON tokens.

Track progress in real time.

### Leaderboard

Podium display for top three players.

List view for positions four through ten.

Ranked by portfolio value.

Shows total yield earned.

Highlights your position.

Updates instantly without refreshing.

### Guilds

Join existing guilds.

Create your own guild.

See guild members' properties.

Share guild benefits.

Compete in guild leaderboards.

### Chat

Global chat connects everyone.

Real-time messaging.

Usernames and avatars.

Share tips and strategies.

Build community.

## Technology Stack

Framework: Next.js 15 (App Router)

Language: TypeScript

UI Library: React 18

Styling: Tailwind CSS

Animations: Framer Motion

Wallet: Wagmi + Viem

Blockchain: Mantle Network (Sepolia Testnet)

Real-time: Socket.io

Rendering: Pixi.js (city map)

Notifications: React Hot Toast

## Environment Variables

Create `.env.local` for custom configuration:

```env
# Contract Addresses (Mantle Sepolia Testnet)
NEXT_PUBLIC_PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
NEXT_PUBLIC_GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=0xb950EE50c98cD686DA34C535955203e2CE065F88
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
NEXT_PUBLIC_TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Network Configuration
NEXT_PUBLIC_MANTLE_CHAIN_ID=5003
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz

# Reown AppKit
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id_here
```

**Note:** Contract addresses are also hardcoded in the source files as a fallback, so the app works even without `.env.local`.

## Mobile Responsiveness

App is fully responsive. Works on desktop, tablet, and mobile devices.

Mobile detection uses:
- Screen width (responsive breakpoints)
- Touch device capabilities
- Viewport optimization

## Troubleshooting

Wallet not connecting:
- Ensure wallet extension is installed
- Check wallet is connected to Mantle Sepolia Testnet network
- Refresh page and try again
- Check browser console for errors

Balance not updating:
- Click refresh button next to balance
- Check console for errors
- Verify contract addresses are correct
- Ensure you are on correct network

Properties not loading:
- Check browser console for errors
- Verify backend is running
- Check network requests in DevTools
- Ensure contract addresses are correct

Transaction fails:
- Check you have sufficient MNT for gas
- Verify contract addresses are correct
- Check browser console for error details
- Ensure you are on Mantle Sepolia Testnet network

Yield not claiming:
- Check property is at least 24 hours old
- Verify yield distributor contract address
- Check browser console for error details
- Ensure you have sufficient gas

Leaderboard not updating:
- Check WebSocket connection in browser console
- Verify backend is running
- Check network tab for WebSocket connections
- Refresh page if connection lost

## Browser Support

Chrome or Edge (recommended)

Firefox

Safari

Mobile browsers (iOS Safari, Chrome Mobile)

## Contract Update Notes

When contracts are redeployed:

Update contract addresses in source files:
- `CONTRACTS` object in `src/lib/contracts.ts`
- Environment variables in `.env.local`

Verify all contract interactions work:
- Buy TYCOON tokens
- Mint properties
- Claim yield
- Trade properties
- Complete quests

Test real-time features:
- Portfolio updates work
- Leaderboard displays correctly
- Chat messaging works
- Yield accumulation updates

## Support

For issues or questions:
- Mantle Documentation: https://docs.mantle.xyz
- Wagmi Documentation: https://wagmi.sh
- Viem Documentation: https://viem.sh
- Next.js Documentation: https://nextjs.org/docs
