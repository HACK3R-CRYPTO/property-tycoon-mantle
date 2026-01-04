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
NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS=0x3F15825DD678D56250ea155bDeac8684369966b3
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
NEXT_PUBLIC_TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E
NEXT_PUBLIC_MOCK_RWA_ADDRESS=0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45

# Oracle RWA Contract (Optional - uses MockRWA if not set)
NEXT_PUBLIC_ORACLE_RWA_ADDRESS=0xYourOracleRWAAddress

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

Property appears on isometric 3D city map instantly.

**Your level and XP update automatically** when you mint a property (100 XP per property)!

### Isometric 3D City Map

The game features a beautiful isometric 3D city map powered by Pixi.js:

**Map Features:**
- **Isometric 3D rendering** - Diamond-shaped tiles with depth and perspective (inspired by noodle-quest style)
- **Realistic terrain** - Water and land tiles with pixel art style textures
- **Property buildings** - Distinct 3D isometric buildings for each property type:
  - Residential: Cozy house with pitched roof, windows, and door (blue)
  - Commercial: Modern store with flat roof and large storefront windows (green)
  - Industrial: Factory with smokestack and grid windows (orange)
  - Luxury: Tall glass skyscraper with lit windows and spire (pink)
- **Ownership markers** - Flag markers on owned properties (brown pole with colored flag and white star)
- **Zoom and pan** - Smooth zoom (0.3x to 3x) and pan controls with map boundaries
- **FIND button** - Center map on any property from "YOUR PROPERTIES" sidebar with auto-zoom to 1.5x
- **Dynamic location display** - Real-time coordinates (N/S, E/W) and sector based on viewport center
- **Other players' properties** - See and click other players' properties on the map to view their details
- **Property colors** - Each property type uses distinct colors matching their building design
- **Sparse trees** - Decorative trees on land tiles (2% density) for visual appeal
- **Fixed map size** - 100x100 tile grid (limited, not infinite) for better performance

**Map Controls:**
- **Zoom In/Out buttons** - Located in bottom-right (or left of sidebar when properties panel is open)
- **Target button** - Centers map on average position of all your properties
- **FIND button** - In "YOUR PROPERTIES" sidebar, centers map on that specific property
- **Mouse wheel** - Zoom in/out at cursor position
- **Click and drag** - Pan the map in any direction

### Link to RWA

Connect property to tokenized real estate:
- Select RWA contract (Oracle-based or MockRWA)
- View only RWA tokens you own (up to 20 tokens displayed)
- Link property to RWA token
- Property generates real yield from rental income
- Estimated yield calculation uses RWA value and yield rate
- Yield display updates in real time with RWA data
- Property validation ensures only existing properties are processed

### Claim Yield

Properties generate yield daily.

Claim yield after 24 hours.

Batch claim all properties at once.

Yield distributed as USDC or USDT.

Real money in your wallet.

**Your level and XP update automatically** when you claim yield (XP increases based on yield amount)!

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

## Chronicle Oracle Integration

Frontend uses Chronicle Oracle to fetch MNT/USD price for USD conversions. All TYCOON amounts are displayed with USD equivalents using real-time price data from Chronicle Oracle.

**Implementation:**
- `useMNTPrice` hook fetches MNT/USD price from backend API endpoint
- Backend fetches price from Chronicle Oracle via whitelisted wallet
- Price updates broadcast via Socket.io every 5 minutes
- Frontend receives real-time price updates without page refresh
- TYCOON/USD rate calculated as: MNT/USD ÷ 100 (since 1 MNT = 100 TYCOON)
- USD values displayed alongside TYCOON amounts in:
  - Yield Display (claimable yield, estimated yield, total earned)
  - Property Cards (property value, total yield earned)
  - Property Details modal (property value, total yield earned)

**Chronicle Oracle Address:**
- MNT/USD: `0xCE0F753FDEEE2D0EC5F1ba086bD7d5087C20c307` (Mantle Sepolia)

**Backend API:**
- `/api/oracle/mnt-price` - Returns MNT/USD and TYCOON/USD prices

Files:
- `src/hooks/useMNTPrice.ts` - Price fetching hook with Socket.io integration

## Mantle Network Integration

Frontend uses Mantle Viem for type-safe blockchain interactions.

### Mantle Viem Integration

Uses @mantleio/viem package for Mantle chain configuration. Pre-configured Mantle and Mantle Sepolia Testnet chains. Type-safe contract interactions with Wagmi hooks. Efficient data fetching with automatic caching. Real-time event subscriptions for instant updates.

Implementation:
- `src/lib/mantle-viem.ts` configures Wagmi with Mantle chains
- Uses mantle and mantleSepoliaTestnet from @mantleio/viem/chains
- Fallback RPC URLs for reliability
- Timeout handling for network requests
- SSR support for Next.js

Why we use it: Mantle Viem provides official chain configurations. Ensures correct network parameters. Type-safe interactions prevent errors. Automatic caching reduces RPC calls.

Features:
- Multiple RPC fallbacks for reliability
- Automatic retry on network errors
- Optimized for Mantle's high throughput
- Real-time event subscriptions
- Type-safe contract calls

Contract interactions include:
- Property NFT minting and management
- Yield claiming and distribution
- Marketplace trading
- Quest completion and rewards
- Token swapping (MNT to TYCOON)
- RWA linking with Oracle support

Files:
- `src/lib/mantle-viem.ts` - Mantle Viem configuration
- `src/lib/contracts.ts` - Contract ABIs and addresses
- `src/config/wagmi.ts` - Wagmi configuration

## Real-Time Features

Portfolio updates instantly without refreshing.

Live yield accumulation tracking.

Instant leaderboard updates via WebSocket.

**Real-time level/XP updates** - Your level and XP update automatically when you mint properties, purchase properties, or claim yield. No page refresh needed!

Property minting with optimized gas costs.

Yield claiming with micro-transaction support.

WebSocket integration via Socket.io:
- Real-time chat messaging
- Portfolio update notifications
- Leaderboard position changes
- Yield accumulation updates
- **Level/XP updates** (`user:level-update` event)

### Level/XP Display

The game page shows your current level, XP progress, and level title in the left sidebar:
- **Level badge**: Shows your current level (e.g., "LVL 11")
- **XP progress bar**: Visual progress toward next level
- **Level title**: Dynamic title based on level:
  - Level 1-4: "RISING TYCOON" 🌱
  - Level 5-9: "PRO TYCOON" 💼
  - Level 10-14: "ELITE TYCOON" ⭐
  - Level 15-19: "MASTER TYCOON" 👑
  - Level 20+: "LEGENDARY TYCOON" 🏆

Level and XP update automatically via WebSocket when you perform XP-boosting actions. The frontend listens to `user:level-update` events and updates the UI immediately.

## Technology Stack

Framework: Next.js 15 (App Router)

Language: TypeScript

UI Library: React 18

Styling: Tailwind CSS

Animations: Framer Motion

Wallet: Wagmi + Viem

Blockchain: Mantle Network (Sepolia Testnet)

Real-time: Socket.io

Rendering: Pixi.js (isometric 3D city map)

Notifications: React Hot Toast

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
│   │   ├── RWALinkModal.tsx         # RWA linking modal
│   │   └── game/
│   │       ├── CityView.tsx          # Isometric 3D city map visualization
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

RWA linking not working:
- Verify you own RWA tokens (check MockRWA contract)
- Check RWA contract address is correct
- Ensure property is not already linked
- Check browser console for errors

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
- Link to RWA
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
