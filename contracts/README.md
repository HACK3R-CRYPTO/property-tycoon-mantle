# Property Tycoon Smart Contracts

Smart contracts for Property Tycoon built with Foundry.

## Setup

Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Install dependencies:
```bash
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test
```

## Deploy

Set up environment variables:
```bash
cp .env.example .env
```

Deploy to Mantle Testnet:
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url mantle_testnet --broadcast --verify
```

## Contracts

- PropertyNFT.sol: ERC-721 for property NFTs
- YieldDistributor.sol: Yield distribution contract
- GameToken.sol: TYCOON token (ERC-20)
- Marketplace.sol: Property trading marketplace
- QuestSystem.sol: Investment quest system

