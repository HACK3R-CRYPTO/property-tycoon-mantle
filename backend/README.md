# Property Tycoon Backend

NestJS backend for Property Tycoon. Manages properties. Distributes yield. Handles marketplace. Tracks quests. Updates leaderboards. Real-time updates via Socket.io. Mantle SDK integration. Oracle price feeds.

## What This Backend Does

You submit property minting requests. Backend validates and processes. You claim yield. Backend distributes rewards. You trade properties. Backend handles marketplace. You complete quests. Backend tracks progress. Leaderboard updates in real time. Portfolio values update instantly. Yield calculations happen automatically. All powered by Mantle Network.

## Prerequisites

Install Node.js 18 or higher. Install npm or yarn. Set up PostgreSQL database. Configure Mantle network access. Have contract addresses ready.

## Installation

Navigate to backend directory:

```bash
cd property-tycoon-mantle/backend
```

Install dependencies:

```bash
npm install
```

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/property_tycoon

# Mantle Network
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
L1_RPC_URL=https://eth.llamarpc.com

# Contract Addresses (Mantle Sepolia Testnet)
PROPERTY_NFT_ADDRESS=0x0AE7119c7187D88643fb7B409937B68828eE733D
GAME_TOKEN_ADDRESS=0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8
YIELD_DISTRIBUTOR_ADDRESS=0x8ee6365644426A4b21B062D05596613b8cbffbe3
MARKETPLACE_ADDRESS=0x6389D7168029715DE118Baf51B6D32eE1EBEa46B
QUEST_SYSTEM_ADDRESS=0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD

# Oracle Addresses (Chronicle)
CHRONICLE_USDC_ORACLE=0x0000000000000000000000000000000000000000
CHRONICLE_USDT_ORACLE=0x0000000000000000000000000000000000000000
CHRONICLE_ETH_ORACLE=0x0000000000000000000000000000000000000000
CHRONICLE_MNT_ORACLE=0x0000000000000000000000000000000000000000

# Private Key (for contract interactions)
PRIVATE_KEY=your_private_key_here

# Server
PORT=3001
```

## Database Setup

Start PostgreSQL using Docker:

```bash
docker-compose up -d postgres
```

Run migrations (when implemented):

```bash
npm run migration:run
```

## Development

Start development server:

```bash
npm run start:dev
```

Server runs on http://localhost:3001

## Build for Production

```bash
npm run build
npm run start:prod
```

## Project Structure

```
backend/
├── src/
│   ├── mantle/
│   │   ├── mantle-sdk.service.ts      # Mantle SDK integration
│   │   ├── oracle.service.ts          # Chronicle Oracle integration
│   │   ├── mantle-api.service.ts     # Mantle custom API methods
│   │   └── mantle.module.ts
│   ├── properties/
│   │   ├── properties.module.ts
│   │   ├── properties.controller.ts
│   │   └── properties.service.ts
│   ├── yield/
│   │   ├── yield.module.ts
│   │   ├── yield.controller.ts
│   │   └── yield.service.ts
│   ├── marketplace/
│   │   ├── marketplace.module.ts
│   │   ├── marketplace.controller.ts
│   │   └── marketplace.service.ts
│   ├── quests/
│   │   ├── quests.module.ts
│   │   ├── quests.controller.ts
│   │   └── quests.service.ts
│   ├── leaderboard/
│   │   ├── leaderboard.module.ts
│   │   ├── leaderboard.controller.ts
│   │   └── leaderboard.service.ts
│   ├── websocket/
│   │   ├── websocket.gateway.ts       # Socket.io real-time updates
│   │   └── websocket.module.ts
│   ├── database/
│   │   ├── schema.ts                  # Drizzle schema
│   │   └── database.module.ts
│   └── app.module.ts
├── package.json
└── README.md
```

## API Endpoints

### Properties

GET /properties - List all properties

GET /properties/:id - Get property by ID

GET /properties/owner/:address - Get properties by owner

POST /properties/mint - Mint new property

### Yield

GET /yield/pending/:address - Get pending yield for address

POST /yield/claim - Claim yield for property

POST /yield/batch-claim - Batch claim yield

### Marketplace

GET /marketplace/listings - Get all listings

POST /marketplace/list - List property for sale

POST /marketplace/buy - Buy property

### Quests

GET /quests - List all quests

GET /quests/progress/:address - Get quest progress

POST /quests/complete - Complete quest

### Leaderboard

GET /leaderboard - Global leaderboard

GET /leaderboard/neighborhood/:id - Neighborhood leaderboard

## Mantle Integration

Backend uses Mantle SDK for cross-chain features. Oracle service fetches prices from Chronicle. Mantle API service uses custom methods. Event indexer listens to contract events. Real-time updates via Socket.io.

### Mantle SDK

Cross-chain messaging. Asset bridging. Gas estimation. Message status checking.

### Oracle Service

Chronicle Oracle integration. USDC/USDT price feeds. Property yield rate calculation. RWA property value fetching.

### Mantle API

eth_getBlockRange for efficient batch queries. rollup_getInfo for node monitoring. Custom Mantle methods.

## Real-Time Updates

Socket.io handles real-time updates. Events emitted when properties created. Events emitted when yield claimed. Events emitted when marketplace trades. Events emitted when leaderboard updates. Frontend subscribes to events. Updates happen instantly.

## Event Indexing

Backend listens to contract events. PropertyCreated events update database. YieldClaimed events update leaderboards. MarketplaceTrade events update listings. QuestCompleted events update progress. All events indexed automatically.

## Contract Addresses

Update contract addresses in `.env` after deployment:

Property NFT: 0x0000000000000000000000000000000000000000

Game Token: 0x0000000000000000000000000000000000000000

Yield Distributor: 0x0000000000000000000000000000000000000000

Marketplace: 0x0000000000000000000000000000000000000000

Quest System: 0x0000000000000000000000000000000000000000

## Testing

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

## Deployment

Deploy to your preferred platform. Set environment variables. Configure database connection. Update contract addresses. Start server.
