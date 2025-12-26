# Property Tycoon Backend

NestJS backend for Property Tycoon. Manages properties. Distributes yield. Handles marketplace. Tracks quests. Updates leaderboards. Real-time updates via Socket.io. Mantle SDK integration. Oracle price feeds.

## What This Backend Does

You submit property minting requests. Backend validates and processes. You claim yield. Backend distributes rewards. You trade properties. Backend handles marketplace. You complete quests. Backend tracks progress. Leaderboard updates in real time. Portfolio values update instantly. Yield calculations happen automatically. All powered by Mantle Network.

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │ HTTP/WebSocket
         │
┌────────▼─────────────────────────────────────────┐
│           NestJS Backend                          │
│  ┌──────────────────────────────────────────┐    │
│  │  Controllers (REST API)                 │    │
│  │  - PropertiesController                 │    │
│  │  - YieldController                      │    │
│  │  - MarketplaceController                │    │
│  │  - QuestsController                     │    │
│  │  - LeaderboardController                │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  Services                                │    │
│  │  - PropertiesService                     │    │
│  │  - YieldService                          │    │
│  │  - MarketplaceService                    │    │
│  │  - QuestsService                         │    │
│  │  - LeaderboardService                    │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  Event Indexer Service                   │    │
│  │  - Listens to contract events            │    │
│  │  - Syncs database                        │    │
│  │  - Emits WebSocket events                │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  Mantle Integration                      │    │
│  │  - MantleSdkService (CrossChain)         │    │
│  │  - MantleApiService (Custom RPC)         │    │
│  │  - MantleGasService (Gas Optimization)   │    │
│  │  - OracleService (Price Feeds)           │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  ContractsService                        │    │
│  │  - PropertyNFT                           │    │
│  │  - GameToken                             │    │
│  │  - YieldDistributor                      │    │
│  │  - Marketplace                           │    │
│  │  - QuestSystem                           │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  WebSocket Gateway                       │    │
│  │  - Real-time updates                     │    │
│  │  - Room-based subscriptions              │    │
│  └──────────────────────────────────────────┘    │
└────────┬─────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│PostgreSQL│ │Mantle Network│
│Database  │ │(Smart Contracts)│
└─────────┘ └─────────────┘
```

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

Database schemas are automatically created using Drizzle ORM. Tables include:

- `users` - User accounts linked to wallet addresses
- `properties` - Property NFTs with metadata
- `yield_records` - Yield claim history
- `marketplace_listings` - Active property listings
- `quests` - Available quests
- `user_quest_progress` - User quest completion tracking
- `leaderboard` - Portfolio rankings

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
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application entry point
│   ├── contracts/                 # Smart contract integration
│   │   ├── abis/                  # Contract ABIs
│   │   │   ├── PropertyNFT.json
│   │   │   ├── GameToken.json
│   │   │   ├── YieldDistributor.json
│   │   │   ├── Marketplace.json
│   │   │   └── QuestSystem.json
│   │   ├── contracts.service.ts   # Contract interaction service
│   │   └── contracts.module.ts
│   ├── database/                  # Database layer
│   │   ├── database.module.ts     # Drizzle ORM setup
│   │   └── schema/                # Database schemas
│   │       ├── users.schema.ts
│   │       ├── properties.schema.ts
│   │       ├── yield.schema.ts
│   │       ├── marketplace.schema.ts
│   │       ├── quests.schema.ts
│   │       └── leaderboard.schema.ts
│   ├── events/                    # Event indexing
│   │   ├── event-indexer.service.ts  # Contract event listener
│   │   └── events.module.ts
│   ├── mantle/                    # Mantle integration
│   │   ├── mantle-sdk.service.ts  # Cross-chain messaging
│   │   ├── mantle-api.service.ts  # Custom RPC methods
│   │   ├── mantle-gas.service.ts  # Gas optimization
│   │   ├── oracle.service.ts      # Chronicle Oracle
│   │   └── mantle.module.ts
│   ├── properties/               # Property management
│   │   ├── properties.controller.ts
│   │   ├── properties.service.ts
│   │   └── properties.module.ts
│   ├── yield/                     # Yield distribution
│   │   ├── yield.controller.ts
│   │   ├── yield.service.ts
│   │   └── yield.module.ts
│   ├── marketplace/              # Marketplace trading
│   │   ├── marketplace.controller.ts
│   │   ├── marketplace.service.ts
│   │   └── marketplace.module.ts
│   ├── quests/                    # Quest system
│   │   ├── quests.controller.ts
│   │   ├── quests.service.ts
│   │   └── quests.module.ts
│   ├── leaderboard/               # Leaderboard rankings
│   │   ├── leaderboard.controller.ts
│   │   ├── leaderboard.service.ts
│   │   └── leaderboard.module.ts
│   ├── chat/                      # Global chat system
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.module.ts
│   └── websocket/                 # Real-time updates
│       └── websocket.gateway.ts   # Socket.io gateway
├── package.json
└── README.md
```

## API Endpoints

### Properties

#### GET /properties
List all properties in the database.

**Response:**
```json
[
  {
    "id": "uuid",
    "tokenId": "123",
    "ownerId": "uuid",
    "propertyType": "Residential",
    "value": "1000000000000000000",
    "yieldRate": "500",
    "totalYieldEarned": "0",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /properties/:id
Get property by database ID.

**Parameters:**
- `id` (string) - Property database UUID

**Response:**
```json
{
  "id": "uuid",
  "tokenId": "123",
  "propertyType": "Residential",
  "value": "1000000000000000000",
  "yieldRate": "500"
}
```

#### GET /properties/owner/:address
Get all properties owned by a wallet address.

**Parameters:**
- `address` (string) - Wallet address (0x...)

**Response:**
```json
[
  {
    "id": "uuid",
    "tokenId": "123",
    "propertyType": "Residential",
    "value": "1000000000000000000"
  }
]
```

#### POST /properties/sync/:address
Sync properties from blockchain to database for a wallet address.

**Parameters:**
- `address` (string) - Wallet address (0x...)

**Response:**
```json
[
  {
    "id": "uuid",
    "tokenId": "123",
    "propertyType": "Residential"
  }
]
```

### Yield

#### GET /yield/pending/:address
Get total pending yield for a wallet address.

**Parameters:**
- `address` (string) - Wallet address (0x...)

**Response:**
```json
{
  "totalPending": "5000000000000000000",
  "formatted": "5.0"
}
```

#### GET /yield/property/:propertyId
Get pending yield for a specific property.

**Parameters:**
- `propertyId` (number) - Property token ID

**Response:**
```json
{
  "pending": "1000000000000000000",
  "formatted": "1.0"
}
```

#### GET /yield/history/:address
Get yield claim history for a wallet address.

**Parameters:**
- `address` (string) - Wallet address (0x...)

**Response:**
```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "amount": "1000000000000000000",
    "claimedAt": "2024-01-01T00:00:00Z",
    "transactionHash": "0x..."
  }
]
```

### Marketplace

#### GET /marketplace/listings
Get all active marketplace listings.

**Response:**
```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "sellerId": "uuid",
    "price": "2000000000000000000",
    "isActive": true,
    "listingType": "fixed_price",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /marketplace/listing/:id
Get a specific marketplace listing.

**Parameters:**
- `id` (number) - Listing ID

**Response:**
```json
{
  "id": "uuid",
  "propertyId": "uuid",
  "price": "2000000000000000000",
  "isActive": true
}
```

### Quests

#### GET /quests
List all available quests.

**Response:**
```json
[
  {
    "id": "uuid",
    "questType": "FirstProperty",
    "name": "First Property",
    "description": "Mint your first property",
    "rewardAmount": "100000000000000000000",
    "isActive": true
  }
]
```

#### GET /quests/:id
Get a specific quest.

**Parameters:**
- `id` (number) - Quest ID

**Response:**
```json
{
  "id": "uuid",
  "questType": "FirstProperty",
  "name": "First Property",
  "description": "Mint your first property",
  "rewardAmount": "100000000000000000000"
}
```

#### GET /quests/progress/:address
Get quest progress for a wallet address.

**Parameters:**
- `address` (string) - Wallet address (0x...)

**Response:**
```json
[
  {
    "questId": "uuid",
    "isCompleted": false,
    "progress": "0",
    "completedAt": null
  }
]
```

#### GET /quests/check/:address/:questId
Check if a quest is completed for an address.

**Parameters:**
- `address` (string) - Wallet address (0x...)
- `questId` (number) - Quest ID

**Response:**
```json
{
  "completed": false,
  "progress": "0"
}
```

### Leaderboard

#### GET /leaderboard
Get global leaderboard rankings.

**Query Parameters:**
- `limit` (number, optional) - Number of results (default: 100)

**Response:**
```json
[
  {
    "userId": "uuid",
    "totalPortfolioValue": "1000000000000000000000",
    "totalYieldCollected": "50000000000000000000",
    "propertiesOwned": "5",
    "questsCompleted": "3",
    "rank": 1
  }
]
```

### Chat

#### POST /chat
Send a chat message.

**Request Body:**
```json
{
  "message": "Hello everyone!",
  "walletAddress": "0x..."
}
```

**Headers:**
- `x-wallet-address` (optional) - Wallet address if not in body

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "walletAddress": "0x...",
  "username": "Player1",
  "message": "Hello everyone!",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### GET /chat/messages
Get recent chat messages.

**Query Parameters:**
- `limit` (number, optional) - Number of messages (default: 50)

**Response:**
```json
[
  {
    "id": "uuid",
    "walletAddress": "0x...",
    "username": "Player1",
    "message": "Hello everyone!",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**Query Parameters:**
- `limit` (number, optional) - Number of results (default: 100)

**Response:**
```json
[
  {
    "userId": "uuid",
    "totalPortfolioValue": "1000000000000000000000",
    "totalYieldCollected": "50000000000000000000",
    "propertiesOwned": "5",
    "questsCompleted": "3",
    "rank": 1
  }
]
```

## Services

### PropertiesService

Manages property data and synchronization with blockchain.

**Methods:**
- `findAll()` - Get all properties
- `findById(id: string)` - Get property by database ID
- `findByOwner(ownerId: string)` - Get properties by owner ID
- `findByWalletAddress(walletAddress: string)` - Get properties by wallet address
- `create(propertyData)` - Create property in database
- `syncFromChain(walletAddress: string)` - Sync properties from blockchain

### YieldService

Handles yield calculations and Oracle integration.

**Methods:**
- `getPendingYield(walletAddress: string)` - Get total pending yield
- `getPropertyYield(propertyId: number)` - Get yield for specific property
- `getYieldHistory(walletAddress: string)` - Get yield claim history
- `calculateYieldWithOracle(propertyId: string, days: number)` - Calculate yield using Oracle
- `getOptimizedGasPrice()` - Get optimized gas prices from Mantle
- `recordYieldClaim(propertyId, ownerId, amount, txHash)` - Record yield claim

### MarketplaceService

Manages marketplace listings and trades.

**Methods:**
- `getActiveListings()` - Get all active listings
- `getListing(listingId: number)` - Get specific listing
- `syncListing(listingId, propertyId, sellerId, price)` - Sync listing from contract
- `markAsSold(listingId, buyerId, txHash)` - Mark listing as sold

### QuestsService

Tracks quest completion and progress.

**Methods:**
- `findAll()` - Get all quests
- `getQuest(questId: number)` - Get specific quest
- `getQuestProgress(walletAddress: string)` - Get quest progress for address
- `checkQuestCompletion(walletAddress: string, questId: number)` - Check if quest completed

### LeaderboardService

Calculates and maintains leaderboard rankings.

**Methods:**
- `getGlobalLeaderboard(limit: number)` - Get global rankings
- `updateLeaderboard(userId: string)` - Update user's leaderboard entry
- `calculateRankings()` - Recalculate all rankings

### ChatService

Manages global chat messages.

**Methods:**
- `sendMessage(walletAddress: string, message: string)` - Send a chat message
- `getRecentMessages(limit: number)` - Get recent messages (default: 50)

### ContractsService

Provides contract interaction methods.

**Methods:**
- `getProperty(tokenId: bigint)` - Get property data from contract
- `getOwnerProperties(ownerAddress: string)` - Get property token IDs for owner
- `getOwnerPropertyCount(ownerAddress: string)` - Get property count
- `calculateYield(propertyId: bigint)` - Calculate yield from contract
- `getTotalPendingYield(ownerAddress: string)` - Get total pending yield
- `getListing(propertyId: bigint)` - Get marketplace listing
- `getAuction(propertyId: bigint)` - Get auction data
- `hasCompletedQuest(playerAddress: string, questType: number)` - Check quest completion
- `getTotalQuestsCompleted(playerAddress: string)` - Get total quests completed

## Event Indexer Service

Automatically listens to contract events and syncs database.

**Events Monitored:**
- `PropertyCreated` - Creates property in database
- `PropertyLinkedToRWA` - Updates RWA link
- `PropertyUpgraded` - Updates property type/value
- `Transfer` - Updates property ownership
- `YieldDistributed` - Logs yield distribution
- `YieldClaimed` - Records yield claim, updates database
- `PropertyListed` - Creates marketplace listing
- `PropertySold` - Updates listing status
- `AuctionCreated` - Creates auction listing
- `AuctionEnded` - Closes auction
- `QuestCompleted` - Updates quest progress

**Features:**
- Real-time event listening
- Periodic sync for missed events (every 60 seconds)
- Uses Mantle's `eth_getBlockRange` for efficient batch queries
- Automatic database synchronization
- WebSocket event emission

## WebSocket Events

Connect to `ws://localhost:3001` for real-time updates.

### Client → Server

#### subscribe:leaderboard
Subscribe to leaderboard updates.

```javascript
socket.emit('subscribe:leaderboard');
```

#### subscribe:portfolio
Subscribe to portfolio updates for a wallet address.

```javascript
socket.emit('subscribe:portfolio', { address: '0x...' });
```

#### subscribe:chat
Subscribe to global chat messages.

```javascript
socket.emit('subscribe:chat');
```

#### chat:message
Send a chat message via WebSocket (alternative to REST API).

```javascript
socket.emit('chat:message', { 
  walletAddress: '0x...', 
  message: 'Hello!' 
});
```

### Server → Client

#### property:created
Emitted when a new property is created.

```json
{
  "propertyId": "uuid",
  "owner": "0x...",
  "propertyType": "Residential"
}
```

#### yield:claimed
Emitted when yield is claimed.

```json
{
  "propertyId": "uuid",
  "owner": "0x...",
  "amount": "1000000000000000000"
}
```

#### portfolio:updated
Emitted to portfolio subscribers when portfolio changes.

```json
{
  "propertyId": "uuid",
  "owner": "0x...",
  "amount": "1000000000000000000"
}
```

#### marketplace:trade
Emitted when a property is sold.

```json
{
  "listingId": 123,
  "seller": "0x...",
  "buyer": "0x...",
  "price": "2000000000000000000"
}
```

#### leaderboard:updated
Emitted to leaderboard subscribers when rankings change.

```json
{
  "rankings": [
    {
      "userId": "uuid",
      "totalPortfolioValue": "1000000000000000000000",
      "rank": 1
    }
  ]
}
```

#### chat:new
Emitted to chat subscribers when a new message is sent.

```json
{
  "id": "uuid",
  "walletAddress": "0x...",
  "username": "Player1",
  "message": "Hello everyone!",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Mantle Integration

### Mantle SDK Service

Cross-chain messaging and asset bridging.

**Methods:**
- `getMessenger()` - Get CrossChainMessenger instance
- `isReady()` - Check if messenger initialized
- `getMessageStatus(messageHash)` - Get L1↔L2 message status
- `estimateDepositGas(amount, tokenAddress?)` - Estimate deposit gas
- `getL2BlockNumber()` - Get current L2 block number
- `getL1BlockNumber()` - Get current L1 block number

### Mantle API Service

Custom Mantle RPC methods for efficiency.

**Methods:**
- `getBlockRange(startBlock, endBlock, includeTransactions)` - Efficient block range query
- `getRollupInfo()` - Get L2 node information
- `isNodeSynced()` - Check if node is synced
- `getL1BlockNumber()` - Get L1 block from rollup info
- `getL2Index()` - Get L2 transaction index

**Benefits:**
- 90%+ reduction in RPC calls for event indexing
- Faster block queries
- Better node monitoring

### Mantle Gas Service

Gas price optimization using GasPriceOracle.

**Methods:**
- `getOptimizedGasPrice()` - Get L1 base fee and L2 gas price
- `estimateL1Fee(transactionData)` - Estimate L1 fee for transaction
- `getFormattedGasPrices()` - Get formatted gas prices for display
- `isNodeReady()` - Check if node is ready

**Benefits:**
- Lower transaction costs
- Better gas estimation
- Optimized cross-chain operations

### Oracle Service

Chronicle Oracle integration for price feeds.

**Methods:**
- `getPrice(oracleAddress)` - Get price from oracle
- `getUSDCPrice()` - Get USDC price
- `getUSDTPrice()` - Get USDT price
- `getETHPrice()` - Get ETH price
- `getMNTPrice()` - Get MNT price
- `getPropertyYieldRate(propertyType)` - Get yield rate for property type
- `getRWAPropertyValue(rwaContract, tokenId)` - Get RWA property value
- `calculateYieldAmount(propertyValue, yieldRate, days)` - Calculate yield amount

## Database Schemas

### users
- `id` (uuid) - Primary key
- `walletAddress` (varchar) - Wallet address (ERC-55)
- `username` (varchar, optional) - Username
- `email` (varchar, optional) - Email
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### properties
- `id` (uuid) - Primary key
- `tokenId` (numeric) - NFT token ID
- `ownerId` (uuid) - Foreign key to users
- `propertyType` (varchar) - Residential, Commercial, Industrial, Luxury
- `value` (numeric) - Property value in TYCOON tokens
- `yieldRate` (numeric) - Annual yield rate (basis points)
- `rwaContractAddress` (varchar, optional) - RWA contract address
- `rwaTokenId` (numeric, optional) - RWA token ID
- `totalYieldEarned` (numeric) - Total yield earned
- `isActive` (boolean)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### yield_records
- `id` (uuid) - Primary key
- `userId` (uuid) - Foreign key to users
- `propertyId` (uuid) - Foreign key to properties
- `amount` (numeric) - Yield amount claimed
- `claimed` (boolean) - Claim status
- `transactionHash` (varchar, optional) - Transaction hash
- `claimedAt` (timestamp, optional)
- `createdAt` (timestamp)

### marketplace_listings
- `id` (uuid) - Primary key
- `propertyId` (uuid) - Foreign key to properties (unique)
- `sellerId` (uuid) - Foreign key to users
- `price` (numeric) - Listing price
- `isActive` (boolean) - Listing status
- `listingType` (varchar) - fixed_price or auction
- `auctionEndTime` (timestamp, optional) - Auction end time
- `highestBid` (numeric, optional) - Highest bid amount
- `highestBidderId` (uuid, optional) - Highest bidder
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### quests
- `id` (uuid) - Primary key
- `questType` (varchar) - Quest type identifier (unique)
- `name` (varchar) - Quest name
- `description` (varchar) - Quest description
- `rewardAmount` (numeric) - Reward in TYCOON tokens
- `isActive` (boolean)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### user_quest_progress
- `id` (uuid) - Primary key
- `userId` (uuid) - Foreign key to users
- `questId` (uuid) - Foreign key to quests
- `isCompleted` (boolean) - Completion status
- `progress` (numeric) - Progress value
- `completedAt` (timestamp, optional)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### leaderboard
- `id` (uuid) - Primary key
- `userId` (uuid) - Foreign key to users (unique)
- `totalPortfolioValue` (numeric) - Sum of property values
- `totalYieldCollected` (numeric) - Total yield claimed
- `propertiesOwned` (numeric) - Property count
- `questsCompleted` (numeric) - Quest completion count
- `lastUpdated` (timestamp)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

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

### Environment Variables

All required environment variables are listed in the Installation section. Ensure all contract addresses are updated after deployment.

### Health Checks

The backend exposes a health check endpoint at `/` (AppController).

## Contract Addresses

Update contract addresses in `.env` after deployment:

Property NFT: 0x0AE7119c7187D88643fb7B409937B68828eE733D

Game Token: 0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8

Yield Distributor: 0x8ee6365644426A4b21B062D05596613b8cbffbe3

Marketplace: 0x6389D7168029715DE118Baf51B6D32eE1EBEa46B

Quest System: 0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD

## Best Mantle Integration

This backend demonstrates advanced Mantle integration:

- **Mantle SDK**: Cross-chain messaging for asset bridging
- **Custom RPC Methods**: `eth_getBlockRange` for efficient event indexing
- **Gas Optimization**: GasPriceOracle integration for cost savings
- **Oracle Integration**: Chronicle Oracle for real-time price feeds
- **Modular Architecture**: Leveraging Mantle's L2 benefits

See `MANTLE_INTEGRATION.md` for detailed integration documentation.
