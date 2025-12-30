#!/bin/bash
# Quick script to check if a property is linked to RWA on-chain

PROPERTY_ID=${1:-1}
PROPERTY_NFT="0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c"
RPC_URL="https://rpc.sepolia.mantle.xyz"

echo "Checking Property #$PROPERTY_ID..."
echo ""

# Check if property is linked
echo "=== On-Chain Link Status ==="
cast call $PROPERTY_NFT "getProperty(uint256)" $PROPERTY_ID --rpc-url $RPC_URL | grep -E "rwaContract|rwaTokenId" || echo "Property data retrieved"

echo ""
echo "=== Yield Calculation ==="
YIELD_DIST="0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4"
YIELD=$(cast call $YIELD_DIST "calculateYield(uint256)" $PROPERTY_ID --rpc-url $RPC_URL)
echo "Claimable Yield: $YIELD wei"
echo "Claimable Yield: $(cast --to-unit $YIELD ether) TYCOON"

