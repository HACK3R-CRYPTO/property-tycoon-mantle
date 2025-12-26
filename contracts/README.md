# Property Tycoon Smart Contracts

Smart contracts for Property Tycoon game. Deploy to Mantle. Test locally. Verify on explorer.

## What These Contracts Do

GameToken: ERC20 token for payments and rewards. Players use TYCOON tokens to mint properties. Properties generate yield in TYCOON tokens.

PropertyNFT: ERC721 NFT contract. Players mint property NFTs by spending TYCOON tokens. Each property is a unique NFT. Properties can be linked to RWA contracts.

YieldDistributor: Distributes yield to property owners. Calculates yield based on property value and yield rate. Handles single and batch yield claims. Distributes TYCOON tokens as rewards.

Marketplace: Property trading marketplace. Players list properties for sale. Other players buy properties. Prices set in TYCOON tokens. Handles property transfers.

QuestSystem: Investment quest system. Tracks quest completion. Distributes quest rewards. Rewards players for portfolio diversification.

## Prerequisites

Install Foundry. Get MNT for gas fees. Have a wallet ready.

Foundry installation: https://book.getfoundry.sh/getting-started/installation

## Installation

Clone the repository. Navigate to contracts folder. Install dependencies.

```bash
git clone <repository-url>
cd property-tycoon-mantle/contracts
forge install
```

Build contracts:

```bash
forge build
```

Run tests:

```bash
forge test
```

All tests must pass before deployment.

## Configuration

Create a `.env` file in the contracts directory:

```
PRIVATE_KEY=0xyour_private_key_with_0x_prefix
MANTLE_API_KEY=your_mantle_api_key
```

Important notes:
- Private key must include 0x prefix
- Get Mantle API key from: https://explorer.sepolia.mantle.xyz/myapikey
- Wallet needs MNT for gas fees on Mantle Sepolia testnet

## Get Testnet Tokens

Get testnet tokens before deploying:

- Mantle Sepolia Faucet: https://faucet.sepolia.mantle.xyz

You need MNT for gas fees.

## Deployment

### Deploy All Contracts

Deploy everything to Mantle Sepolia Testnet:

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.sepolia.mantle.xyz --broadcast --verify
```

This deploys all five contracts. Sets up relationships. Links contracts together. Verifies on explorer.

### Deploy to Mantle Mainnet

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://rpc.mantle.xyz --broadcast --verify
```

## Deployed Contracts

Mantle Sepolia Testnet:

GameToken: 0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8

PropertyNFT: 0x0AE7119c7187D88643fb7B409937B68828eE733D

YieldDistributor: 0x8ee6365644426A4b21B062D05596613b8cbffbe3

Marketplace: 0x6389D7168029715DE118Baf51B6D32eE1EBEa46B

QuestSystem: 0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD

View contracts on Mantle Explorer: https://explorer.sepolia.mantle.xyz

## Usage

### Mint Property NFT

Spend TYCOON tokens. Call mintProperty function on PropertyNFT contract. Choose property type. Property NFT minted to your address.

Property types:
- Residential: 100 TYCOON tokens. 5 percent APY.
- Commercial: 200 TYCOON tokens. 8 percent APY.
- Industrial: 500 TYCOON tokens. 12 percent APY.
- Luxury: 1000 TYCOON tokens. 15 percent APY.

### Claim Yield

Properties generate yield daily. Call claimYield function on YieldDistributor contract. Receive TYCOON tokens. Batch claim supported for multiple properties.

### Trade Properties

List property for sale. Call listProperty function on Marketplace contract. Set price in TYCOON tokens. Other players buy your property. Property transfers to buyer.

### Complete Quests

Finish investment challenges. Call completeQuest function on QuestSystem contract. Receive quest rewards. Track progress on-chain.

## Network Configuration

Mantle Sepolia Testnet:
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://explorer.sepolia.mantle.xyz

Mantle Mainnet:
- Chain ID: 5000
- RPC: https://rpc.mantle.xyz
- Explorer: https://explorer.mantle.xyz
