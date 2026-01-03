const { createPublicClient, http, encodeFunctionData } = require('viem');
const { mantleSepoliaTestnet } = require('@mantleio/viem/chains');

// Contract addresses
const YIELD_DISTRIBUTOR = '0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4';
const PROPERTY_NFT = '0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c';
const OWNER = '0x3210607AC8126770E850957cE7373ee7e59e3A29';

// ABI snippets
const YIELD_DISTRIBUTOR_ABI = [
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'calculateYield',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'claimYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'lastYieldUpdate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const PROPERTY_NFT_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getOwnerProperties',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getProperty',
    outputs: [
      { name: 'propertyType', type: 'uint8' },
      { name: 'value', type: 'uint256' },
      { name: 'yieldRate', type: 'uint256' },
      { name: 'rwaContract', type: 'address' },
      { name: 'rwaTokenId', type: 'uint256' },
      { name: 'totalYieldEarned', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const RPC_URL = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';

const publicClient = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport: http(RPC_URL),
});

async function testClaim() {
  console.log('=== Testing Claim Yield ===\n');
  console.log('RPC URL:', RPC_URL);
  console.log('YieldDistributor:', YIELD_DISTRIBUTOR);
  console.log('PropertyNFT:', PROPERTY_NFT);
  console.log('Owner:', OWNER);
  console.log('');

  try {
    // 1. Get owner's properties
    console.log('1. Getting owner properties...');
    const propertyIds = await publicClient.readContract({
      address: PROPERTY_NFT,
      abi: PROPERTY_NFT_ABI,
      functionName: 'getOwnerProperties',
      args: [OWNER],
    });
    console.log('Property IDs:', propertyIds.map(id => id.toString()));
    console.log('');

    if (propertyIds.length === 0) {
      console.log('No properties found for this owner');
      return;
    }

    // Test with first property
    const propertyId = propertyIds[0];
    console.log('Testing with Property ID:', propertyId.toString());
    console.log('');

    // 2. Check property owner
    console.log('2. Checking property owner...');
    const propertyOwner = await publicClient.readContract({
      address: PROPERTY_NFT,
      abi: PROPERTY_NFT_ABI,
      functionName: 'ownerOf',
      args: [propertyId],
    });
    console.log('Property Owner:', propertyOwner);
    console.log('Expected Owner:', OWNER);
    console.log('Owner Match:', propertyOwner.toLowerCase() === OWNER.toLowerCase());
    console.log('');

    // 3. Get property data
    console.log('3. Getting property data...');
    const property = await publicClient.readContract({
      address: PROPERTY_NFT,
      abi: PROPERTY_NFT_ABI,
      functionName: 'getProperty',
      args: [propertyId],
    });
    console.log('Property Data:');
    console.log('  Type:', property[0]);
    console.log('  Value:', property[1].toString());
    console.log('  Yield Rate:', property[2].toString());
    console.log('  RWA Contract:', property[3]);
    console.log('  RWA Token ID:', property[4].toString());
    console.log('  Total Yield Earned:', property[5].toString());
    console.log('  Created At:', new Date(Number(property[6]) * 1000).toISOString());
    console.log('  Is Active:', property[7]);
    console.log('');

    // 4. Check last yield update
    console.log('4. Checking last yield update...');
    const lastUpdate = await publicClient.readContract({
      address: YIELD_DISTRIBUTOR,
      abi: YIELD_DISTRIBUTOR_ABI,
      functionName: 'lastYieldUpdate',
      args: [propertyId],
    });
    console.log('Last Yield Update:', lastUpdate.toString());
    if (lastUpdate > 0n) {
      console.log('Last Update Date:', new Date(Number(lastUpdate) * 1000).toISOString());
    } else {
      console.log('Last Update: Never (using property creation time)');
    }
    console.log('');

    // 5. Calculate yield (view function)
    console.log('5. Calculating yield (view function)...');
    try {
      const yieldAmount = await publicClient.readContract({
        address: YIELD_DISTRIBUTOR,
        abi: YIELD_DISTRIBUTOR_ABI,
        functionName: 'calculateYield',
        args: [propertyId],
      });
      console.log('Calculate Yield Result:', yieldAmount.toString());
      console.log('Yield Amount (TYCOON):', (Number(yieldAmount) / 1e18).toFixed(4));
      console.log('');

      if (yieldAmount === 0n) {
        console.log('WARNING: calculateYield returned 0 - no yield to claim');
        console.log('This could be because:');
        console.log('  1. Not enough time has passed (24 hours required)');
        console.log('  2. Property has no yield accumulated');
        console.log('  3. RWA contract call is failing');
      }
    } catch (error) {
      console.log('ERROR calculating yield:', error.message);
      if (error.cause) {
        console.log('Error cause:', error.cause);
      }
    }
    console.log('');

    // 6. Estimate gas for claimYield
    console.log('6. Estimating gas for claimYield...');
    try {
      const data = encodeFunctionData({
        abi: YIELD_DISTRIBUTOR_ABI,
        functionName: 'claimYield',
        args: [propertyId],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: OWNER,
        to: YIELD_DISTRIBUTOR,
        data: data,
      });

      console.log('Estimated Gas:', gasEstimate.toString());
      console.log('Estimated Gas (with 30% buffer):', ((gasEstimate * 130n) / 100n).toString());
      console.log('');

      // Check if it's higher than 2,000,000 (the limit that was failing)
      if (gasEstimate > 2000000n) {
        console.log('⚠️  Gas estimate is HIGHER than 2,000,000!');
        console.log('This explains why the transaction was failing.');
      } else {
        console.log('✓ Gas estimate is within normal range');
      }
    } catch (error) {
      console.log('ERROR estimating gas:', error.message);
      if (error.cause) {
        console.log('Error cause:', error.cause);
      }
      if (error.data) {
        console.log('Error data:', error.data);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
  }
}

testClaim().catch(console.error);

