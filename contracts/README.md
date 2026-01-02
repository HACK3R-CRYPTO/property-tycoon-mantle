# Property Tycoon Smart Contracts

Smart contracts for Property Tycoon game. Deploy to Mantle. Test locally. Verify on explorer.

## What These Contracts Do

GameToken: ERC20 token for payments and rewards. Players use TYCOON tokens to mint properties. Properties generate yield in TYCOON tokens.

PropertyNFT: ERC721 NFT contract. Players mint property NFTs by spending TYCOON tokens. Each property is a unique NFT. Properties can be linked to RWA contracts.

YieldDistributor: Distributes yield to property owners. Calculates yield based on property value and yield rate. If property is linked to RWA, uses RWA value and yield rate for calculation. Handles single and batch yield claims. Distributes TYCOON tokens as rewards.

Marketplace: Property trading marketplace. Players list properties for sale. Other players buy properties. Prices set in TYCOON tokens. Handles property transfers.

QuestSystem: Investment quest system. Tracks quest completion. Distributes quest rewards. Rewards players for portfolio diversification.

TokenSwap: MNT to TYCOON token swap. Players buy TYCOON tokens with MNT. Exchange rate: 1 MNT = 100 TYCOON tokens.

MockRWA: Mock Real-World Asset contract for demo and testing. **Currently used for this demo instead of real Chronicle Oracle RWA.** Implements ERC-721 standard. Replaced with real RWA contracts in production. Simulates tokenized real estate assets. Chronicle Oracle integration is ready but not actively used in this demo.

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
MOCK_RWA_ADDRESS=0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45
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

# Deploy MockRWA
forge create src/MockRWA.sol:MockRWA \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --verify
```

## Deployed Contracts

Mantle Sepolia Testnet:

GameToken: 0x3334f87178AD0f33e61009777a3dFa1756e9c23f

PropertyNFT: 0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c

YieldDistributor: 0x3b655bEE5c43A055C78FfEdDC5C8E3989fa7267D (Fixed - RWA interface compatibility, authorized to mint tokens)

Marketplace: 0x6b6b65843117C55da74Ea55C954a329659EFBeF0

QuestSystem: 0x89f72227168De554A28874aA79Bcb6f0E8e2227C

TokenSwap: 0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

MockRWA: 0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45

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

Linking property to RWA updates yield calculation automatically. YieldDistributor contract checks if property is linked to RWA. If linked, fetches RWA value and yield rate from RWA contract using IRWA interface (via `properties` mapping for compatibility). Uses RWA data for yield calculation instead of property data. Property generates real yield from RWA rental income. Yield calculation now dynamically uses the linked RWA's value and yield rate. If RWA call fails or property not linked, falls back to property's own value and yield rate. Backward compatible with existing properties. All yield calculations happen on-chain via YieldDistributor contract.

**YieldDistributor Status:** Contract is deployed and configured. Authorized to mint TYCOON tokens when users claim yield. Uses RWA data (value and yield rate) when properties are linked to RWA contracts. Each RWA token has its own value and APY defined in the RWA contract, so yield calculation is dynamic based on the specific RWA linked. MockRWA includes 5 test tokens with different APYs ranging from 6% to 15% APY. The property's base value and yield rate are only used as fallback if the property is not linked to RWA or if RWA data is unavailable.

### Claim Yield

Call `claimYield` or `batchClaimYield` function on YieldDistributor contract.

Yield calculated based on property value and yield rate. If property linked to RWA, uses RWA value and yield rate instead. RWA yield rate calculated from RWA monthly yield and value. Automatic fallback ensures all properties generate yield correctly.

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

### Mint RWA Properties for Different Addresses

Use the `MintRWAForAddresses` script to distribute RWA tokens:

1. Edit `script/MintRWAForAddresses.s.sol`
2. Update the `recipients` array with target addresses
3. Set `MOCK_RWA_ADDRESS=0xDF1D8Bce49E57f12e78e5881bcFE2f546e7A5a45` in `.env`
4. Run:

```bash
forge script script/MintRWAForAddresses.s.sol:MintRWAForAddresses \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --broadcast
```

Uses MockRWA for demo and testing. Allows testing RWA linking without real tokenized assets. Perfect for hackathons and demos. Replaced with real RWA contracts in production.

## Mantle Network Benefits

Property minting costs 0.001 MNT. Yield claiming costs 0.0005 MNT. Marketplace trading costs 0.002 MNT. Quest completion costs 0.001 MNT.

Supports real-time multiplayer interactions. Handles concurrent property minting. Processes multiple yield claims simultaneously.

Sub-second transaction confirmation. Instant portfolio updates. Real-time leaderboard synchronization.

Standard Solidity contracts. Works with existing tooling. OpenZeppelin contracts integration.

## Mantle Integration in Contracts

Contracts deployed on Mantle Sepolia Testnet. Optimized for Mantle's low fees and high throughput.

Why Mantle for Property Tycoon:
- Low gas costs enable frequent yield claims
- High throughput supports real-time multiplayer
- Fast finality ensures instant portfolio updates
- EVM compatibility works with existing tools

Contract verification uses Mantle Explorer API. Automatic verification during deployment. Manual verification supported via Etherscan API key.

Gas optimization:
- Property minting optimized for batch operations
- Yield claiming uses minimal gas
- Marketplace trades cost less than other chains
- Quest completion requires minimal gas

All contracts use standard Solidity patterns. OpenZeppelin contracts for security. ReentrancyGuard on all state-changing functions. SafeERC20 for token transfers.

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

### Link to RWA

```typescript
await writeContract({
  address: PROPERTY_NFT_ADDRESS,
  abi: PropertyNFTABI,
  functionName: "linkToRWA",
  args: [propertyTokenId, rwaContractAddress, rwaTokenId],
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
│   ├── TokenSwap.sol
│   └── MockRWA.sol
├── test/
│   └── PropertyNFT.t.sol
├── script/
│   ├── FreshDeploy.s.sol
│   ├── DeployAll.s.sol
│   ├── DeployMockRWA.s.sol
│   └── MintRWAForAddresses.s.sol
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
- Test full flow: buy TYCOON, mint property, link RWA, claim yield, complete quest

## Support

For issues or questions:
- Mantle Documentation: https://docs.mantle.xyz
- Foundry Book: https://book.getfoundry.sh
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts
