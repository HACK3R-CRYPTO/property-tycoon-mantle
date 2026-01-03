#!/bin/bash
# Simple test script using cast to diagnose claim yield issue
# This avoids the Foundry system configuration bug

export PATH="$HOME/.foundry/bin:$PATH"

# Contract addresses
YIELD_DISTRIBUTOR="0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4"
PROPERTY_NFT="0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c"
RPC_URL="${MANTLE_RPC_URL:-https://rpc.sepolia.mantle.xyz}"
OWNER="0x3210607AC8126770E850957cE7373ee7e59e3A29"

echo "=== Testing Claim Yield with Cast ==="
echo "RPC URL: $RPC_URL"
echo ""

# Get owner's properties
echo "1. Getting owner properties..."
./run-cast.sh call $PROPERTY_NFT "getOwnerProperties(address)" $OWNER --rpc-url $RPC_URL 2>&1 | head -20

echo ""
echo "2. Testing with Property ID 1..."
PROPERTY_ID=1

# Check owner
echo "   Checking property owner..."
./run-cast.sh call $PROPERTY_NFT "ownerOf(uint256)" $PROPERTY_ID --rpc-url $RPC_URL 2>&1

# Calculate yield
echo "   Calculating yield..."
./run-cast.sh call $YIELD_DISTRIBUTOR "calculateYield(uint256)" $PROPERTY_ID --rpc-url $RPC_URL 2>&1

# Estimate gas (if private key is set)
if [ -n "$PRIVATE_KEY" ]; then
    echo "   Estimating gas..."
    ./run-cast.sh estimate $YIELD_DISTRIBUTOR "claimYield(uint256)" $PROPERTY_ID \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY 2>&1
fi

