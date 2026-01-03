#!/bin/bash

# Test claim yield transaction using cast
# This will help us see what's actually failing

# Contract addresses (Mantle Sepolia Testnet)
YIELD_DISTRIBUTOR="0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4"
PROPERTY_NFT="0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c"
RPC_URL="${MANTLE_RPC_URL:-https://rpc.sepolia.mantle.xyz}"

# Get from environment or use defaults
PROPERTY_ID="${PROPERTY_ID:-1}"
OWNER="${OWNER_ADDRESS:-0x3210607AC8126770E850957cE7373ee7e59e3A29}"

echo "=== Testing Claim Yield ==="
echo "RPC URL: $RPC_URL"
echo "YieldDistributor: $YIELD_DISTRIBUTOR"
echo "Property ID: $PROPERTY_ID"
echo "Owner: $OWNER"
echo ""

# First, let's check who owns the property
echo "1. Checking property owner..."
cast call $PROPERTY_NFT "ownerOf(uint256)" $PROPERTY_ID --rpc-url $RPC_URL
echo ""

# Check property data
echo "2. Getting property data..."
cast call $PROPERTY_NFT "getProperty(uint256)" $PROPERTY_ID --rpc-url $RPC_URL
echo ""

# Try to calculate yield (view function)
echo "3. Calculating yield (view function)..."
cast call $YIELD_DISTRIBUTOR "calculateYield(uint256)" $PROPERTY_ID --rpc-url $RPC_URL
echo ""

# Check last yield update
echo "4. Checking last yield update..."
cast call $YIELD_DISTRIBUTOR "lastYieldUpdate(uint256)" $PROPERTY_ID --rpc-url $RPC_URL
echo ""

# Estimate gas for claimYield
echo "5. Estimating gas for claimYield..."
if [ -n "$PRIVATE_KEY" ]; then
    cast estimate $YIELD_DISTRIBUTOR "claimYield(uint256)" $PROPERTY_ID \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY
else
    echo "PRIVATE_KEY not set, skipping gas estimation"
    echo "Set PRIVATE_KEY in environment to estimate gas"
fi
echo ""

# Try to simulate the transaction (dry run)
echo "6. Simulating claimYield transaction..."
if [ -n "$PRIVATE_KEY" ]; then
    echo "Attempting to call claimYield..."
    cast send $YIELD_DISTRIBUTOR "claimYield(uint256)" $PROPERTY_ID \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY \
        --gas-limit 5000000 \
        --legacy
else
    echo "PRIVATE_KEY not set, skipping transaction"
    echo "Set PRIVATE_KEY in environment to execute transaction"
fi

