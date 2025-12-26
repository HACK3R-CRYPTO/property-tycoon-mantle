import { Address } from 'viem';
import { wagmiConfig } from './mantle-viem';
import { readContract, writeContract } from 'wagmi/actions';
import PropertyNFTABI from '../contracts/abis/PropertyNFT.json';
import GameTokenABI from '../contracts/abis/GameToken.json';
import YieldDistributorABI from '../contracts/abis/YieldDistributor.json';
import MarketplaceABI from '../contracts/abis/Marketplace.json';
import QuestSystemABI from '../contracts/abis/QuestSystem.json';

// Contract addresses (Mantle Sepolia Testnet)
export const CONTRACTS = {
  PropertyNFT: (process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS || '0x0AE7119c7187D88643fb7B409937B68828eE733D') as Address,
  GameToken: (process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS || '0x32D9a9b9e241Da421f34786De0B39fD34D1EfeA8') as Address,
  YieldDistributor: (process.env.NEXT_PUBLIC_YIELD_DISTRIBUTOR_ADDRESS || '0x8ee6365644426A4b21B062D05596613b8cbffbe3') as Address,
  Marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x6389D7168029715DE118Baf51B6D32eE1EBEa46B') as Address,
  QuestSystem: (process.env.NEXT_PUBLIC_QUEST_SYSTEM_ADDRESS || '0xb5a595A6cd30D1798387A2c781E0646FCA8c4AeD') as Address,
} as const;

// Export ABIs
export { PropertyNFTABI, GameTokenABI, YieldDistributorABI, MarketplaceABI, QuestSystemABI };

// Use full ABIs from JSON files
export const PROPERTY_NFT_ABI = PropertyNFTABI;
export const YIELD_DISTRIBUTOR_ABI = YieldDistributorABI;

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

