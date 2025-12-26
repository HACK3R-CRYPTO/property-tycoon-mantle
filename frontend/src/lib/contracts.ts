import { Address } from 'viem';
import { wagmiConfig } from './mantle-viem';
import { readContract, writeContract } from 'wagmi/actions';

// Contract addresses (update after deployment)
export const CONTRACTS = {
  PropertyNFT: (process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS || '0x') as Address,
  GameToken: (process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS || '0x') as Address,
  YieldDistributor: (process.env.NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS || '0x') as Address,
  Marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x') as Address,
  QuestSystem: (process.env.NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS || '0x') as Address,
} as const;

// PropertyNFT ABI (simplified - import full ABI from contracts)
export const PROPERTY_NFT_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'propertyType', type: 'uint8' }, { name: 'value', type: 'uint256' }, { name: 'yieldRate', type: 'uint256' }],
    name: 'mintProperty',
    outputs: [{ name: '', type: 'uint256' }],
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

// YieldDistributor ABI (simplified)
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

/**
 * Mint a property NFT
 */
export async function mintProperty(
  to: Address,
  propertyType: number,
  value: bigint,
  yieldRate: bigint,
) {
  return writeContract(wagmiConfig, {
    address: CONTRACTS.PropertyNFT,
    abi: PROPERTY_NFT_ABI,
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
  return writeContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: YIELD_DISTRIBUTOR_ABI,
    functionName: 'claimYield',
    args: [propertyId],
  });
}

/**
 * Batch claim yield for multiple properties
 */
export async function batchClaimYield(propertyIds: bigint[]) {
  return writeContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: YIELD_DISTRIBUTOR_ABI,
    functionName: 'batchClaimYield',
    args: [propertyIds],
  });
}

/**
 * Calculate yield for a property
 */
export async function calculateYield(propertyId: bigint) {
  return readContract(wagmiConfig, {
    address: CONTRACTS.YieldDistributor,
    abi: YIELD_DISTRIBUTOR_ABI,
    functionName: 'calculateYield',
    args: [propertyId],
  });
}

