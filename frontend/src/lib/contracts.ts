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
  ]).then(([pnft, gt, yd, mp, qs]) => {
    PropertyNFTABI = pnft;
    GameTokenABI = gt;
    YieldDistributorABI = yd;
    MarketplaceABI = mp;
    QuestSystemABI = qs;
  }).catch(console.error);
}

// Contract addresses (Mantle Sepolia Testnet)
export const CONTRACTS = {
  PropertyNFT: (process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS || '0x0AE7119c7187D88643fb7B409937B68828eE733D') as Address,
  GameToken: (process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS || '0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8') as Address,
  YieldDistributor: (process.env.NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS || '0x7549a25b9a5206569f6778c6be6a7620687f5A38') as Address,
  Marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x6389D7168029715DE118Baf51B6D32eE1EBEa46B') as Address,
  QuestSystem: (process.env.NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS || '0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD') as Address,
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
] as const;

export const QUEST_SYSTEM_ABI = [
  {
    inputs: [{ name: 'questType', type: 'uint256' }],
    name: 'claimQuestReward',
    outputs: [],
    stateMutability: 'nonpayable',
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
 * Get owner's properties
 */
export async function getOwnerProperties(owner: Address) {
  return readContract(wagmiConfig, {
    address: CONTRACTS.PropertyNFT,
    abi: PROPERTY_NFT_ABI,
    functionName: 'getOwnerProperties',
    args: [owner],
  });
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

