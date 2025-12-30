# Property Tycoon Backend

NestJS backend for Property Tycoon. Manages properties. Distributes yield. Handles marketplace. Tracks quests. Updates leaderboards. Real-time updates via Socket.io. Mantle SDK integration. Chronicle Oracle price feeds.

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
PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
YIELD_DISTRIBUTOR_ADDRESS=0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4
MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E
MOCK_RWA_ADDRESS=0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45

# Chronicle Oracle (Optional)
CHRONICLE_RWA_PROPERTY_ORACLE=0xYourChronicleOracleAddress

# Private Key (for contract interactions)
PRIVATE_KEY=your_private_key_here

# Server
PORT=3001
```

Important notes:
- Private key must include 0x prefix
- Backend wallet needs MNT for gas fees
- Get testnet tokens from Mantle faucet
- Database will be auto-initialized on first run

## Database Setup

Start PostgreSQL using Docker:

```bash
cd property-tycoon-mantle
docker-compose up -d postgres
```

Initialize database:

```bash
cd backend
npm run db:init
```

Database schemas are automatically created using Drizzle ORM. Tables include:
- `users` - User accounts linked to wallet addresses
- `properties` - Property NFTs with metadata
- `yield_records` - Yield claim history
- `marketplace_listings` - Active property listings
- `quests` - Available quests
- `quest_progress` - User quest completion tracking
- `leaderboard` - Portfolio rankings
- `chat_messages` - Global chat messages
- `guilds` - Guild information
- `guild_members` - Guild membership

## Development

Start development server:

```bash
npm run start:dev
```

Server runs on http://localhost:3001

API documentation available at http://localhost:3001/api/docs

## Production

Use process manager like PM2:

```bash
pm2 start dist/main.js --name property-tycoon-backend
```

Or deploy to your preferred hosting platform.

## API Endpoints

### Properties

GET `/api/properties/:address` - Get user's properties

POST `/api/properties/sync/:address` - Sync properties from blockchain

### Yield

GET `/api/yield/pending/:address` - Get pending yield

GET `/api/yield/property/:propertyId` - Get property yield

GET `/api/yield/history/:address` - Get yield history

### Marketplace

GET `/api/marketplace/listings` - Get active listings

POST `/api/marketplace/list` - List property for sale

POST `/api/marketplace/purchase` - Purchase listed property

### Quests

GET `/api/quests` - Get all quests

GET `/api/quests/:id` - Get specific quest

GET `/api/quests/sync` - Sync quests from contract

GET `/api/quests/sync-progress/:address` - Sync quest progress

POST `/api/quests/:id/claim` - Claim quest reward

### Leaderboard

GET `/api/leaderboard` - Get global leaderboard

POST `/api/leaderboard/sync/:address` - Sync and update leaderboard

### Chat

POST `/api/chat/messages` - Send chat message

GET `/api/chat/messages` - Get recent messages

### Users

GET `/api/users/profile/:walletAddress` - Get user profile

PUT `/api/users/profile/:walletAddress/username` - Update username

### Guilds

GET `/api/guilds` - Get all guilds

POST `/api/guilds` - Create guild

GET `/api/guilds/:id` - Get guild details

POST `/api/guilds/:id/join` - Join guild

## Mantle Integration

Backend uses multiple Mantle tools for advanced blockchain operations.

### Mantle SDK Integration

Uses @mantleio/sdk package for cross-chain operations. CrossChainMessenger handles L1 to L2 asset bridging. Deposit and withdrawal estimation for gas optimization. Message status tracking for reliable cross-chain operations. L1 to L2 asset transfers for RWA tokenization.

Implementation:
- MantleSdkService initializes CrossChainMessenger
- Connects to L1 and L2 providers
- Tracks message status for cross-chain transfers
- Estimates gas for deposits and withdrawals
- Monitors L1 and L2 block numbers

Why we use it: Enables RWA assets to bridge from Ethereum mainnet to Mantle L2. Reduces costs for large asset transfers. Provides reliable cross-chain messaging.

### Mantle API Service

Uses Mantle custom RPC methods for efficient data queries. eth_getBlockRange fetches multiple blocks in one call. rollup_getInfo monitors L2 node status. Reduces RPC calls by 90 percent for event indexing.

Implementation:
- MantleApiService calls custom RPC methods
- eth_getBlockRange for batch block queries
- rollup_getInfo for node sync status
- L1 and L2 block number tracking
- L2 transaction index monitoring

Why we use it: Event indexing requires many block queries. Standard RPC needs one call per block. Mantle custom methods fetch 100 blocks in one call. Reduces backend load and improves performance.

### Mantle Gas Service

Uses Mantle GasPriceOracle for gas optimization. Tracks L1 base fee and L2 gas price. Estimates transaction costs accurately. Optimizes batch transactions.

Implementation:
- MantleGasService queries GasPriceOracle contract
- Gets L1 base fee for cross-chain operations
- Gets L2 gas price for local transactions
- Estimates L1 fees for transaction data
- Checks node sync status before transactions

Why we use it: Yield claims happen frequently. Gas optimization saves costs. Accurate estimates prevent failed transactions. Batch operations require cost estimation.

Files:
- `src/mantle/mantle-sdk.service.ts` - CrossChainMessenger integration
- `src/mantle/mantle-api.service.ts` - Custom RPC method calls
- `src/mantle/mantle-gas.service.ts` - GasPriceOracle integration

## Chronicle Oracle Integration

Uses Chronicle Oracle for price feeds on Mantle Sepolia. 60 to 80 percent less gas than other oracles. Critical for frequent yield calculations. Property value updates cost less.

Chronicle Oracle integration is implemented in `OracleService` with methods to fetch real-time prices for USDC, USDT, ETH, and MNT (`getUSDCPrice`, `getUSDTPrice`, `getETHPrice`, `getMNTPrice`). However, these price feed methods are not currently being called in the application. The integration is ready for use but not actively utilized in this demo.

RWA property values can be fetched from Chronicle when `CHRONICLE_RWA_PROPERTY_ORACLE` is configured in `getRWAPropertyValue()` method, but this environment variable is not set. The system falls back to contract queries (MockRWA) when Chronicle oracle is not configured.

YieldDistributor contract uses RWA data for yield calculation. If property linked to RWA, contract fetches RWA value and yield rate. Uses RWA data instead of property data for yield calculation. Automatic fallback to property data if RWA not linked or unavailable. All yield calculations happen on-chain via YieldDistributor contract.

Backend yield service also uses RWA data for estimated yield calculations. When property is linked to RWA, backend fetches RWA value and yield rate from blockchain. Uses RWA data for pending yield calculations. Falls back to property data if RWA fetch fails. BigInt values are properly serialized to numbers for JSON responses.

Chronicle Oracle addresses on Mantle Sepolia:
- USDC/USD: 0x9Dd500569A6e77ECdDE7694CDc2E58ac587768D0
- USDT/USD: 0xD671F5F7c2fb6f75439641C36a578842f5b376A9
- ETH/USD: 0xa6896dCf3f5Dc3c29A5bD3a788D6b7e901e487D8
- MNT/USD: 0xCE0F753FDEEE2D0EC5F1ba086bD7d5087C20c307

Schnorr-based architecture ensures secure price feeds. Data freshness validation with 3-hour default threshold. tryReadWithAge functions prevent reverts. Graceful fallbacks if oracle data is stale.

## Event Indexing

Backend listens to contract events and syncs database automatically:

- `PropertyCreated` - New property minted
- `PropertyLinkedToRWA` - Property linked to RWA
- `YieldClaimed` - Yield claimed by owner
- `PropertyPurchased` - Property sold on marketplace
- `QuestCompleted` - Quest completed by player

Events are indexed in real-time and broadcast via WebSocket to frontend.

## BigInt Serialization

Backend properly handles BigInt values in JSON responses. All property methods convert BigInt fields (tokenId, rwaTokenId, totalYieldEarned) to numbers or strings before returning. This prevents "Do not know how to serialize a BigInt" errors when sending data to frontend.

## WebSocket Events

Backend emits real-time events via Socket.io:

- `property:created` - New property minted
- `yield:updated` - Yield accumulation updated
- `leaderboard:updated` - Leaderboard position changed
- `chat:new` - New chat message
- `quest:completed` - Quest completed

Frontend subscribes to these events for instant updates.

## Project Structure

```
backend/
├── src/
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application entry point
│   ├── contracts/                 # Smart contract integration
│   ├── database/                  # Database layer (Drizzle ORM)
│   ├── events/                    # Event indexing service
│   ├── mantle/                    # Mantle integration
│   ├── properties/               # Property management
│   ├── yield/                     # Yield distribution
│   ├── marketplace/              # Marketplace trading
│   ├── quests/                    # Quest system
│   ├── leaderboard/              # Leaderboard management
│   ├── chat/                      # Chat system
│   ├── users/                     # User profile management
│   ├── guilds/                    # Guild system
│   └── websocket/                # WebSocket gateway
├── package.json
└── README.md
```

## Security

Backend includes security features:
- Input validation on all endpoints
- SQL injection prevention via Drizzle ORM
- CORS enabled for frontend access
- Error handling prevents crashes
- Rate limiting on critical endpoints
- Private key stored securely in environment variables

## Troubleshooting

Server not starting:
- Check `.env` file has correct values
- Ensure Node.js version is 18 or higher
- Check port 3001 is available
- Verify dependencies installed: `npm install`
- Check PostgreSQL is running

Database connection fails:
- Verify DATABASE_URL is correct
- Check PostgreSQL is accessible
- Run `npm run db:init` to initialize database
- Check database logs for errors

Contract interaction fails:
- Check backend wallet has MNT for gas
- Verify contract addresses are correct
- Check RPC URL is accessible
- Ensure contracts are deployed on Mantle Sepolia

Event indexing not working:
- Check event indexer service is running
- Verify contract addresses match deployed contracts
- Check RPC connection is stable
- Review event indexer logs

## Testing

Test API endpoints:

```bash
# Get properties
curl http://localhost:3001/api/properties/0x...

# Get leaderboard
curl http://localhost:3001/api/leaderboard

# Get quests
curl http://localhost:3001/api/quests
```

## Support

For issues or questions:
- Mantle Documentation: https://docs.mantle.xyz
- NestJS Documentation: https://docs.nestjs.com
- Drizzle ORM Documentation: https://orm.drizzle.team
- Socket.io Documentation: https://socket.io/docs
