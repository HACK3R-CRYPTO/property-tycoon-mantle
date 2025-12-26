#!/bin/bash

# Property Tycoon Contract Deployment Script
# Deploys all contracts to Mantle Testnet

set -e

echo "=== Property Tycoon Contract Deployment ==="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

# Check if MANTLE_API_KEY is set
if [ -z "$MANTLE_API_KEY" ]; then
    echo "Warning: MANTLE_API_KEY not set. Contracts will deploy but not verify."
fi

echo "Building contracts..."
forge build

echo ""
echo "Deploying contracts to Mantle Testnet..."
echo ""

# Deploy using script
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mantle_testnet \
  --broadcast \
  --verify \
  -vvv

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Please update the following files with the deployed addresses:"
echo "1. backend/.env"
echo "2. frontend/.env.local"
echo "3. README.md (root)"
echo ""

