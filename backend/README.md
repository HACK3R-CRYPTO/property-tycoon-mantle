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
PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
YIELD_DISTRIBUTOR_ADDRESS=0xb950EE50c98cD686DA34C535955203e2CE065F88
MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

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
docker-compose up -d postgres
```

Initialize database:

```bash
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

Backend leverages Mantle's modular architecture for advanced blockchain operations:

**Mantle SDK Service:**
- Cross-chain messaging for asset bridging
- Deposit and withdrawal estimation
- Message status tracking
- L1 to L2 asset transfers for RWA tokenization

**Mantle API Service:**
- Custom RPC method calls (`eth_getBlockRange`)
- Rollup information queries (`rollup_getInfo`)
- Gas price optimization using Mantle's GasPriceOracle
- Enhanced performance through custom API methods

**Mantle Gas Service:**
- Gas price optimization for frequent transactions
- Batch transaction support
- Cost estimation for yield claims

**Oracle Service:**
- Chronicle Oracle integration for price feeds
- USDC/USDT/ETH/MNT price tracking
- Yield calculation based on real-time prices

### Event Indexing

Backend listens to contract events and syncs database automatically:

- `PropertyCreated` - New property minted
- `PropertyLinkedToRWA` - Property linked to RWA
- `YieldClaimed` - Yield claimed by owner
- `PropertyPurchased` - Property sold on marketplace
- `QuestCompleted` - Quest completed by player

Events are indexed in real-time and broadcast via WebSocket to frontend.

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
