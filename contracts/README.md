# Property Tycoon Smart Contracts

Smart contracts for Property Tycoon game. Deploy to Mantle. Test locally. Verify on explorer.

## What These Contracts Do

GameToken: ERC20 token for payments and rewards. Players use TYCOON tokens to mint properties. Properties generate yield in TYCOON tokens.

PropertyNFT: ERC721 NFT contract. Players mint property NFTs by spending TYCOON tokens. Each property is a unique NFT. Properties can be linked to RWA contracts.

YieldDistributor: Distributes yield to property owners. Calculates yield based on property value and yield rate. Handles single and batch yield claims. Distributes TYCOON tokens as rewards.

Marketplace: Property trading marketplace. Players list properties for sale. Other players buy properties. Prices set in TYCOON tokens. Handles property transfers.

QuestSystem: Investment quest system. Tracks quest completion. Distributes quest rewards. Rewards players for portfolio diversification.

TokenSwap: MNT to TYCOON token swap. Players buy TYCOON tokens with MNT. Exchange rate: 1 MNT = 100 TYCOON tokens.

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

```env
PRIVATE_KEY=0xyour_private_key_with_0x_prefix
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
ETHERSCAN_API_KEY=your_etherscan_api_key
```

Important notes:
- Private key must include 0x prefix
- Get testnet tokens from Mantle faucet
- Etherscan API key works for Mantle networks

## Get Testnet Tokens

Get testnet tokens before deploying:

- Mantle Sepolia Faucet: https://faucet.sepolia.mantle.xyz

You need MNT for gas fees.

## Deployment

### Deploy All Contracts

Deploy everything to Mantle Sepolia Testnet:

```bash
forge script script/FreshDeploy.s.sol:FreshDeployScript \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --broadcast \
  --verify
```

This deploys all contracts. Sets up relationships. Activates features. Verifies on explorer.

### Deploy Individual Contracts

Deploy contracts individually if needed:

```bash
# Deploy GameToken
forge create src/GameToken.sol:GameToken \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --constructor-args "Property Tycoon Token" "TYCOON" \
  --verify

# Deploy PropertyNFT
forge create src/PropertyNFT.sol:PropertyNFT \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --verify

# Deploy YieldDistributor
forge create src/YieldDistributor.sol:YieldDistributor \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --constructor-args <GAME_TOKEN_ADDRESS> <PROPERTY_NFT_ADDRESS> \
  --verify
```

## Deployed Contracts

Mantle Sepolia Testnet:

GameToken: 0x3334f87178AD0f33e61009777a3dFa1756e9c23f

PropertyNFT: 0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c

YieldDistributor: 0xb950EE50c98cD686DA34C535955203e2CE065F88

Marketplace: 0x6b6b65843117C55da74Ea55C954a329659EFBeF0

QuestSystem: 0x89f72227168De554A28874aA79Bcb6f0E8e2227C

TokenSwap: 0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

View contracts on Mantle Explorer: https://explorer.sepolia.mantle.xyz

## Usage

### Buy TYCOON Tokens with MNT

Send MNT to TokenSwap contract. Receive TYCOON tokens.

Exchange rate: 1 MNT equals 100 TYCOON tokens.

Minimum purchase: 0.001 MNT.

### Mint Property NFT

Approve TYCOON tokens. Call `purchaseProperty` function on PropertyNFT contract.

Property types:
- Residential: 100 TYCOON tokens
- Commercial: 200 TYCOON tokens
- Industrial: 500 TYCOON tokens
- Luxury: 1000 TYCOON tokens

### Link Property to RWA

Call `linkToRWA` function on PropertyNFT contract.

Provide RWA contract address and token ID.

Property generates yield from RWA rental income.

### Claim Yield

Call `claimYield` or `batchClaimYield` function on YieldDistributor contract.

Yield calculated based on property value and yield rate.

Minimum 24 hours required before first claim.

### List Property for Sale

Approve Marketplace to transfer NFT.

Call `listProperty` function on Marketplace contract.

Set price in TYCOON tokens.

Choose fixed price or auction.

### Complete Quests

Call quest check functions on QuestSystem contract:
- `checkFirstPropertyQuest` - Own at least 1 property
- `checkDiversifyPortfolioQuest` - Own 3 different property types
- `checkPropertyMogulQuest` - Own at least 10 properties
- `checkRWAPioneerQuest` - Link 5 properties to RWA

Rewards automatically minted to player wallet.

## Mantle Network Benefits

**Low Gas Costs:**
- Property minting: ~0.001 MNT
- Yield claiming: ~0.0005 MNT
- Marketplace trading: ~0.002 MNT
- Quest completion: ~0.001 MNT

**High Throughput:**
- Supports real-time multiplayer interactions
- Handles concurrent property minting
- Processes multiple yield claims simultaneously

**Fast Finality:**
- Sub-second transaction confirmation
- Instant portfolio updates
- Real-time leaderboard synchronization

**EVM Compatibility:**
- Standard Solidity contracts
- Works with existing tooling
- OpenZeppelin contracts integration

## Testing

Run all tests:

```bash
forge test
```

Run with detailed output:

```bash
forge test -vvv
```

Run specific test:

```bash
forge test --match-test testMintProperty
```

## Frontend Integration

### Connect to Mantle Network

```typescript
import { defineChain } from "viem";

const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  network: "mantle-sepolia",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.sepolia.mantle.xyz"
    }
  }
});
```

### Get Contract Instance

```typescript
import { getContract } from "wagmi/actions";

const propertyNFT = getContract({
  address: "0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c",
  abi: PropertyNFTABI,
});
```

### Mint Property

```typescript
await writeContract({
  address: PROPERTY_NFT_ADDRESS,
  abi: PropertyNFTABI,
  functionName: "purchaseProperty",
  args: [propertyType, value, yieldRate],
  value: parseEther("0"), // No ETH needed, uses TYCOON tokens
});
```

### Claim Yield

```typescript
await writeContract({
  address: YIELD_DISTRIBUTOR_ADDRESS,
  abi: YieldDistributorABI,
  functionName: "batchClaimYield",
  args: [propertyIds],
});
```

## Network Configuration

Mantle Sepolia Testnet:
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://explorer.sepolia.mantle.xyz

Mantle Mainnet:
- Chain ID: 5000
- RPC: https://rpc.mantle.xyz
- Explorer: https://explorer.mantle.xyz

## Contract Verification

Contracts verify automatically during deployment using Etherscan API key.

Verification works on Mantle networks.

Manual verification:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_PATH>:<CONTRACT_NAME> \
  --chain-id 5003 \
  --verifier etherscan \
  --verifier-url https://explorer.sepolia.mantle.xyz/api \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args <ARGS>
```

## Project Structure

```
contracts/
├── src/
│   ├── GameToken.sol
│   ├── PropertyNFT.sol
│   ├── YieldDistributor.sol
│   ├── Marketplace.sol
│   ├── QuestSystem.sol
│   └── TokenSwap.sol
├── test/
│   └── PropertyNFT.t.sol
├── script/
│   ├── FreshDeploy.s.sol
│   └── DeployAll.s.sol
├── foundry.toml
└── README.md
```

## Security

Contracts include security features:
- ReentrancyGuard prevents reentrancy attacks
- SafeERC20 handles token transfers safely
- Input validation on all functions
- Owner-only functions protected
- Supply limits enforced
- Access control for critical operations

## Troubleshooting

Deployment fails:
- Check `.env` file has correct values
- Ensure you have enough MNT for gas fees
- Verify network connectivity
- Check contract compilation: `forge build`

Verification fails:
- Ensure `ETHERSCAN_API_KEY` is set in `.env`
- Check API key is valid
- Wait a few minutes after deployment before verification
- Try manual verification on explorer

Tests fail:
- Run `forge clean` and rebuild
- Check Solidity version matches (0.8.24)
- Verify dependencies installed: `forge install`

## Contract Update Notes

After deploying new contracts:
- Update contract addresses in backend `.env`
- Update contract addresses in frontend `.env.local`
- Update contract addresses in source files
- Verify all contracts on explorer
- Test full flow: buy TYCOON, mint property, claim yield, complete quest

## Support

For issues or questions:
- Mantle Documentation: https://docs.mantle.xyz
- Foundry Book: https://book.getfoundry.sh
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts
