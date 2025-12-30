import { Address } from 'viem';
import { wagmiConfig } from './mantle-viem';
import { readContract, writeContract } from 'wagmi/actions';

// Import ABIs from public folder (loaded at runtime)
// For TypeScript, we'll use dynamic imports or fetch
let PropertyNFTABI: any = null;
let GameTokenABI: any = null;
let YieldDistributorABI: any = null;
let MarketplaceABI: any = null;
let QuestSystemABI: any = null;

// Load ABIs dynamically
if (typeof window !== 'undefined') {
  Promise.all([
    fetch('/abis/PropertyNFT.json').then(r => r.json()),
    fetch('/abis/GameToken.json').then(r => r.json()),
    fetch('/abis/YieldDistributor.json').then(r => r.json()),
    fetch('/abis/Marketplace.json').then(r => r.json()),
    fetch('/abis/QuestSystem.json').then(r => r.json()),
    fetch('/abis/TokenSwap.json').then(r => r.json()).catch(() => null), // Optional, fallback to inline ABI
  ]).then(([pnft, gt, yd, mp, qs, ts]) => {
    PropertyNFTABI = pnft;
    GameTokenABI = gt;
    YieldDistributorABI = yd;
    MarketplaceABI = mp;
    QuestSystemABI = qs;
    // TokenSwapABI can use inline ABI if fetch fails
  }).catch(console.error);
}

// Contract addresses (Mantle Sepolia Testnet)
export const CONTRACTS = {
  PropertyNFT: (process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS || '0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c') as Address,
  GameToken: (process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS || '0x3334f87178AD0f33e61009777a3dFa1756e9c23f') as Address,
  YieldDistributor: (process.env.NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS || '0xb950EE50c98cD686DA34C535955203e2CE065F88') as Address,
  Marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x6b6b65843117C55da74Ea55C954a329659EFBeF0') as Address,
  QuestSystem: (process.env.NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS || '0x89f72227168De554A28874aA79Bcb6f0E8e2227C') as Address,
  TokenSwap: (process.env.NEXT_PUBLIC_TOKEN_SWAP_ADDRESS || '0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E') as Address,
} as const;

// Fallback inline ABIs for critical functions (used until dynamic ABIs load)
export const PROPERTY_NFT_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'propertyType', type: 'uint8' }, { name: 'value', type: 'uint256' }, { name: 'yieldRate', type: 'uint256' }],
    name: 'mintProperty',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyType', type: 'uint8' }, { name: 'value', type: 'uint256' }, { name: 'yieldRate', type: 'uint256' }],
    name: 'purchaseProperty',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getProperty',
    outputs: [
      {
        components: [
          { name: 'propertyType', type: 'uint8' },
          { name: 'value', type: 'uint256' },
          { name: 'yieldRate', type: 'uint256' },
          { name: 'rwaContract', type: 'address' },
          { name: 'rwaTokenId', type: 'uint256' },
          { name: 'totalYieldEarned', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getOwnerProperties',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
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
] as const;

export const YIELD_DISTRIBUTOR_ABI = [
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'claimYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyIds', type: 'uint256[]' }],
    name: 'batchClaimYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'calculateYield',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'YIELD_UPDATE_INTERVAL',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'lastYieldUpdate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const MARKETPLACE_ABI = [
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'buyProperty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'propertyId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    name: 'listProperty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'propertyId', type: 'uint256' },
      { name: 'startingPrice', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    name: 'createAuction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'propertyId', type: 'uint256' }],
    name: 'listings',
    outputs: [
      { name: 'propertyId', type: 'uint256' },
      { name: 'seller', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveListings',
    outputs: [
      { name: 'propertyIds', type: 'uint256[]' },
      { name: 'sellers', type: 'address[]' },
      { name: 'prices', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveListingsCount',
    outputs: [{ name: 'count', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const QUEST_SYSTEM_ABI = [
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'checkFirstPropertyQuest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'checkDiversifyPortfolioQuest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'checkPropertyMogulQuest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'checkRWAPioneerQuest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }, { name: 'questType', type: 'uint8' }],
    name: 'hasCompletedQuest',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Mint a property NFT
 */
export async function mintProperty(
  to: Address,
  propertyType: number,
  value: bigint,
  yieldRate: bigint,
) {
  // Use dynamic ABI if available, otherwise fallback
  const abi = PropertyNFTABI || PROPERTY_NFT_ABI;
  return writeContract(wagmiConfig, {
    address: CONTRACTS.PropertyNFT,
    abi: abi,
    functionName: 'mintProperty',
    args: [to, propertyType, value, yieldRate],
  });
}

/**
 * Get property details
 */
export async function getProperty(tokenId: bigint) {
  return readContract(wagmiConfig, {
    address: CONTRACTS.PropertyNFT,
    abi: PROPERTY_NFT_ABI,
    functionName: 'getProperty',
    args: [tokenId],
  });
}

/**
 * Get owner's properties with retry logic
 */
export async function getOwnerProperties(owner: Address): Promise<bigint[]> {
  const maxRetries = 3;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${maxRetries}: Fetching properties for ${owner}...`);
      const result = await readContract(wagmiConfig, {
        address: CONTRACTS.PropertyNFT,
        abi: PROPERTY_NFT_ABI,
        functionName: 'getOwnerProperties',
        args: [owner],
      }) as bigint[];
      
      console.log(`✅ Successfully fetched ${result.length} properties`);
      return result || [];
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || error.toString();
      console.warn(`⚠️ Attempt ${attempt} failed:`, errorMessage);
      
      // If it's a revert error and user might have no properties, return empty array
      if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
        // Check if it's because user has no properties (shouldn't revert, but handle gracefully)
        if (attempt === maxRetries) {
          console.log('⚠️ getOwnerProperties reverted - user may have no properties yet, returning empty array');
          return [];
        }
      }
      
      // If it's a network error, wait before retrying
      if (attempt < maxRetries && (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('HTTP'))) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      // If it's not a network error, throw immediately
      if (!error.message?.includes('fetch') && !error.message?.includes('network') && !error.message?.includes('HTTP')) {
        throw error;
      }
    }
  }
  
  // All retries failed
  console.error('❌ All attempts failed to fetch properties:', lastError);
  throw new Error(`Failed to fetch properties after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Claim yield for a property
 */
export async function claimYield(propertyId: bigint) {
  const abi = YieldDistributorABI || YIELD_DISTRIBUTOR_ABI;
  return writeContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: abi,
    functionName: 'claimYield',
    args: [propertyId],
  });
}

/**
 * Batch claim yield for multiple properties
 */
export async function batchClaimYield(propertyIds: bigint[]) {
  const abi = YieldDistributorABI || YIELD_DISTRIBUTOR_ABI;
  return writeContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: abi,
    functionName: 'batchClaimYield',
    args: [propertyIds],
  });
}

/**
 * Calculate yield for a property
 */
export async function calculateYield(propertyId: bigint) {
  const abi = YieldDistributorABI || YIELD_DISTRIBUTOR_ABI;
  return readContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: abi,
    functionName: 'calculateYield',
    args: [propertyId],
  });
}

export const TOKEN_SWAP_ABI = [
  {
    inputs: [],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'mntAmount', type: 'uint256' }],
    name: 'getTycoonAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTokenBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EXCHANGE_RATE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

