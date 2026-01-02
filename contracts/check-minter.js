// Quick script to check minter status
const { createPublicClient, http } = require('viem');
const { mantleSepolia } = require('viem/chains');

const GAME_TOKEN_ADDRESS = '0x3334f87178AD0f33e61009777a3dFa1756e9c23f';
const YIELD_DISTRIBUTOR_ADDRESS = '0x37e425aece1e2fc89b286cf7a63a74e8c7a791c4';

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http('https://rpc.sepolia.mantle.xyz'),
});

async function checkMinter() {
  try {
    const isMinter = await publicClient.readContract({
      address: GAME_TOKEN_ADDRESS,
      abi: [
        {
          inputs: [{ name: '', type: 'address' }],
          name: 'minters',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'minters',
      args: [YIELD_DISTRIBUTOR_ADDRESS],
    });

    console.log('==========================================');
    console.log('Minter Status Check');
    console.log('==========================================');
    console.log('GameToken:', GAME_TOKEN_ADDRESS);
    console.log('YieldDistributor:', YIELD_DISTRIBUTOR_ADDRESS);
    console.log('Is Minter:', isMinter ? '✅ YES' : '❌ NO');
    console.log('==========================================');

    if (!isMinter) {
      console.log('\n⚠️  YieldDistributor is NOT set as minter!');
      console.log('Run SetupMinter.s.sol to fix this.');
    } else {
      console.log('\n✅ YieldDistributor is authorized to mint tokens');
    }
  } catch (error) {
    console.error('Error checking minter status:', error.message);
  }
}

checkMinter();

