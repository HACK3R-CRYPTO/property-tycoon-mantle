'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useConfig } from 'wagmi';
import { parseEther } from 'viem';
import { CityView } from '@/components/game/CityView';
import { PropertyCard } from '@/components/game/PropertyCard';
import { BuildMenu } from '@/components/game/BuildMenu';
import { YieldDisplay } from '@/components/game/YieldDisplay';
import { PropertyDetails } from '@/components/game/PropertyDetails';
import { GlobalChat } from '@/components/GlobalChat';
import { UserProfile } from '@/components/UserProfile';
import { WalletConnect } from '@/components/WalletConnect';
import { RWALinkModal } from '@/components/RWALinkModal';
import { GameGuide } from '@/components/game/GameGuide';
import { Guilds } from '@/components/Guilds';
import { Marketplace } from '@/components/Marketplace';
import { Quests } from '@/components/Quests';
import { TokenPurchase } from '@/components/TokenPurchase';
import { MessageSquare, Building2, BookOpen, Trophy, Users, ShoppingBag, Target, Coins, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { getOwnerProperties, calculateYield, CONTRACTS, PROPERTY_NFT_ABI, YIELD_DISTRIBUTOR_ABI } from '@/lib/contracts';
import { readContract, getBlock, getPublicClient } from 'wagmi/actions';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Property {
  id: string;
  tokenId: number;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
  value: bigint;
  yieldRate: number;
  totalYieldEarned: bigint;
  createdAt?: Date; // Property creation date from blockchain
  x: number;
  y: number;
  rwaContract?: string;
  rwaTokenId?: number;
  isListed?: boolean; // Whether property is listed in marketplace
}

export default function GamePage() {
  const { address, isConnected } = useAccount();
  const config = useConfig();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGuilds, setShowGuilds] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);
  const [showSellProperty, setShowSellProperty] = useState(false);
  const [propertyToSell, setPropertyToSell] = useState<Property | null>(null);
  const [showRWALink, setShowRWALink] = useState(false);
  const [totalPendingYield, setTotalPendingYield] = useState<bigint>(BigInt(0)); // Real-time estimated yield
  const [claimableYield, setClaimableYield] = useState<bigint>(BigInt(0)); // On-chain claimable yield (24-hour requirement)
  const [propertyClaimableYields, setPropertyClaimableYields] = useState<Map<number, bigint>>(new Map()); // Claimable yield per property
  const [totalYieldEarned, setTotalYieldEarned] = useState<bigint>(BigInt(0));
  const [yieldUpdateTimestamp, setYieldUpdateTimestamp] = useState<number>(Date.now()); // Force re-render when WebSocket updates
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tokenBalanceValue, setTokenBalanceValue] = useState<bigint>(BigInt(0));
  const [otherPlayersProperties, setOtherPlayersProperties] = useState<Array<Property & { owner: string; isOwned: boolean }>>([]);
  const [pendingPropertyType, setPendingPropertyType] = useState<'Residential' | 'Commercial' | 'Industrial' | 'Luxury' | null>(null);

  // Load properties function - FROM BACKEND (synced from blockchain)
  const loadProperties = useCallback(async () => {
    if (!address || !isConnected) {
      console.log('Cannot load properties: address or connection missing', { address, isConnected });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Loading properties from backend for:', address);
      
      // Try to load from backend first (faster, already synced)
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${BACKEND_URL}/properties/owner/${address}`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (response.ok) {
          const backendProperties = await response.json();
          console.log(`✅ Loaded ${backendProperties.length} properties from backend`);
          console.log('📋 Backend property tokenIds:', backendProperties.map((p: any) => p.tokenId));
          
          if (backendProperties.length > 0) {
            // Convert backend properties to frontend format
            const mappedProperties: Property[] = await Promise.all(
              backendProperties.map(async (prop: any, index: number) => {
                // Backend returns value as string (NUMERIC), convert to BigInt
                const value = typeof prop.value === 'string' 
                  ? BigInt(prop.value) 
                  : BigInt(prop.value?.toString() || '0');
                const totalYieldEarned = typeof prop.totalYieldEarned === 'string'
                  ? BigInt(prop.totalYieldEarned)
                  : BigInt(prop.totalYieldEarned?.toString() || '0');
                
                // ALWAYS fetch property data from contract (source of truth)
                // This includes createdAt, rwaContract, and rwaTokenId
                // Backend data may be stale, so we trust the blockchain
                let createdAt: Date | undefined = undefined;
                let rwaContract: string | undefined = undefined;
                let rwaTokenId: number | undefined = undefined;
                
                try {
                  const propData = await readContract(config, {
                    address: CONTRACTS.PropertyNFT,
                    abi: PROPERTY_NFT_ABI,
                    functionName: 'getProperty',
                    args: [BigInt(prop.tokenId)],
                  }) as { 
                    createdAt: bigint;
                    rwaContract: `0x${string}`;
                    rwaTokenId: bigint;
                  };
                  
                  const createdAtTimestamp = Number(propData.createdAt);
                  createdAt = new Date(createdAtTimestamp * 1000);
                  
                  // Fetch RWA link data from contract (source of truth)
                  if (propData.rwaContract && 
                      propData.rwaContract !== '0x0000000000000000000000000000000000000000') {
                    rwaContract = propData.rwaContract;
                    rwaTokenId = Number(propData.rwaTokenId);
                    console.log(`🔗 Property #${prop.tokenId}: Linked to RWA ${rwaContract}, token ${rwaTokenId}`);
                  }
                  
                  // Calculate time remaining until yield becomes claimable (24 hours requirement)
                  const YIELD_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                  const timeElapsedMs = Date.now() - createdAt.getTime();
                  const timeRemainingMs = YIELD_UPDATE_INTERVAL_MS - timeElapsedMs;
                  const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);
                  const isClaimable = timeElapsedMs >= YIELD_UPDATE_INTERVAL_MS;
                  
                  console.log(`📅 Property #${prop.tokenId}: Contract data (source of truth):`, {
                    contractTimestamp: createdAtTimestamp,
                    contractDate: createdAt.toISOString(),
                    elapsedHours: (timeElapsedMs / (1000 * 60 * 60)).toFixed(2),
                    elapsedDays: (timeElapsedMs / (1000 * 60 * 60 * 24)).toFixed(2),
                    hoursUntilClaimable: isClaimable ? '0 (READY!)' : hoursRemaining.toFixed(2),
                    isClaimable: isClaimable,
                    rwaContract: rwaContract || 'Not linked',
                    rwaTokenId: rwaTokenId || 'N/A',
                    note: 'Yield requires 24 hours (YIELD_UPDATE_INTERVAL) before becoming claimable',
                  });
                  
                  if (prop.createdAt) {
                    const backendDate = new Date(prop.createdAt);
                    const backendDiff = Math.abs(createdAt.getTime() - backendDate.getTime());
                    if (backendDiff > 60000) { // More than 1 minute difference
                      console.warn(`⚠️ Property #${prop.tokenId}: Backend createdAt differs from contract!`, {
                        backendDate: prop.createdAt,
                        contractDate: createdAt.toISOString(),
                        differenceHours: (backendDiff / (1000 * 60 * 60)).toFixed(2),
                      });
                    }
                  }
                  
                  // Check if RWA link differs between backend and contract
                  if (rwaContract && (prop.rwaContract !== rwaContract || prop.rwaTokenId !== rwaTokenId)) {
                    console.warn(`⚠️ Property #${prop.tokenId}: RWA link differs between backend and contract!`, {
                      backendRWA: prop.rwaContract || 'Not linked',
                      contractRWA: rwaContract,
                      backendTokenId: prop.rwaTokenId || 'N/A',
                      contractTokenId: rwaTokenId,
                      note: 'Using contract data (source of truth)',
                    });
                  }
                } catch (error) {
                  console.warn(`Failed to fetch property data from contract for property ${prop.tokenId}:`, error);
                  // Fallback to backend if contract fetch fails
                  if (prop.createdAt) {
                    createdAt = new Date(prop.createdAt);
                  }
                  rwaContract = prop.rwaContract || undefined;
                  rwaTokenId = prop.rwaTokenId || undefined;
                }
                
                return {
                  id: prop.id || `prop-${prop.tokenId}`,
                  tokenId: prop.tokenId,
                  propertyType: prop.propertyType as Property['propertyType'],
                  value: value,
                  yieldRate: prop.yieldRate || 500,
                  totalYieldEarned: totalYieldEarned,
                  createdAt: createdAt,
                  x: prop.x ?? (index % 10),
                  y: prop.y ?? Math.floor(index / 10),
                  rwaContract: rwaContract, // Use contract data (source of truth)
                  rwaTokenId: rwaTokenId, // Use contract data (source of truth)
                  isOwned: true,
                };
              })
            );
            
            setProperties(mappedProperties);
            
            // Calculate total yield earned
            const totalYield = mappedProperties.reduce((sum, p) => sum + p.totalYieldEarned, BigInt(0));
            setTotalYieldEarned(totalYield);
            
            // Calculate claimable yield and time remaining from contract (requires 24 hours) - PER PROPERTY
            let totalClaimable = BigInt(0);
            const claimableYieldsMap = new Map<number, bigint>();
            const timeRemainingMap = new Map<number, { hours: number; minutes: number; isClaimable: boolean }>();
            
            // Get YIELD_UPDATE_INTERVAL from contract
            let yieldUpdateInterval = BigInt(86400); // Default 1 day in seconds
            try {
              const interval = await readContract(config, {
                address: CONTRACTS.YieldDistributor,
                abi: YIELD_DISTRIBUTOR_ABI,
                functionName: 'YIELD_UPDATE_INTERVAL',
              }) as bigint;
              yieldUpdateInterval = interval;
              console.log(`⏰ YIELD_UPDATE_INTERVAL from contract: ${interval.toString()} seconds = ${Number(interval) / 3600} hours`);
            } catch (error) {
              console.warn('Failed to fetch YIELD_UPDATE_INTERVAL, using default 86400 seconds');
            }
            
            // Get current block timestamp
            let currentBlockTimestamp = Math.floor(Date.now() / 1000); // Fallback to current time
            try {
              const block = await getBlock(config, { blockTag: 'latest' });
              currentBlockTimestamp = Number(block.timestamp);
              console.log(`⏰ Current block timestamp: ${currentBlockTimestamp} (${new Date(currentBlockTimestamp * 1000).toISOString()})`);
            } catch (error) {
              console.warn('Failed to fetch block timestamp, using current time');
            }
            
            const claimablePromises = mappedProperties.map(async (prop) => {
              try {
                // Get lastYieldUpdate from contract
                let lastUpdate = BigInt(0);
                try {
                  lastUpdate = await readContract(config, {
                    address: CONTRACTS.YieldDistributor,
                    abi: YIELD_DISTRIBUTOR_ABI,
                    functionName: 'lastYieldUpdate',
                    args: [BigInt(prop.tokenId)],
                  }) as bigint;
                } catch (error) {
                  console.warn(`Failed to fetch lastYieldUpdate for property ${prop.tokenId}`);
                }
                
                // If lastYieldUpdate is 0, use createdAt from PropertyNFT
                let startTimestamp = lastUpdate;
                if (lastUpdate === BigInt(0) && prop.createdAt) {
                  startTimestamp = BigInt(Math.floor(prop.createdAt.getTime() / 1000));
                  console.log(`📅 Property #${prop.tokenId}: Using createdAt (lastYieldUpdate was 0)`);
                } else if (lastUpdate > BigInt(0)) {
                  console.log(`📅 Property #${prop.tokenId}: Using lastYieldUpdate from contract`);
                }
                
                // Calculate time elapsed and remaining
                const timeElapsed = BigInt(currentBlockTimestamp) - startTimestamp;
                const timeElapsedSeconds = Number(timeElapsed);
                const timeElapsedHours = timeElapsedSeconds / 3600;
                const isClaimable = timeElapsed >= yieldUpdateInterval;
                
                let hoursRemaining = 0;
                let minutesRemaining = 0;
                if (!isClaimable) {
                  const timeRemaining = yieldUpdateInterval - timeElapsed;
                  const timeRemainingSeconds = Number(timeRemaining);
                  hoursRemaining = Math.floor(timeRemainingSeconds / 3600);
                  minutesRemaining = Math.floor((timeRemainingSeconds % 3600) / 60);
                }
                
                timeRemainingMap.set(prop.tokenId, {
                  hours: hoursRemaining,
                  minutes: minutesRemaining,
                  isClaimable,
                });
                
                console.log(`⏱️ Property #${prop.tokenId} time status:`, {
                  lastUpdate: lastUpdate.toString(),
                  startTimestamp: startTimestamp.toString(),
                  currentTimestamp: currentBlockTimestamp.toString(),
                  timeElapsed: `${timeElapsedHours.toFixed(2)} hours`,
                  hoursRemaining: isClaimable ? '0 (READY!)' : `${hoursRemaining}h ${minutesRemaining}m`,
                  isClaimable,
                });
                
                // Get claimable yield with better error handling and fallback calculation
                let claimable = BigInt(0);
                try {
                  const yieldPromise = calculateYield(BigInt(prop.tokenId));
                  const timeoutPromise = new Promise<bigint>((_, reject) => {
                    setTimeout(() => reject(new Error('calculateYield timeout')), 10000); // 10 second timeout
                  });
                  const yieldAmount = await Promise.race([yieldPromise, timeoutPromise]);
                  claimable = typeof yieldAmount === 'bigint' ? yieldAmount : BigInt(yieldAmount?.toString() || '0');
                  console.log(`📊 Property #${prop.tokenId} claimable yield from contract: ${claimable.toString()} wei (${Number(claimable) / 1e18} TYCOON)`);
                } catch (error: any) {
                  const errorMsg = error?.message || error?.toString() || 'Unknown error';
                  const isRevert = errorMsg.includes('revert') || errorMsg.includes('execution reverted');
                  const isRWAError = errorMsg.includes('RWA') || errorMsg.includes('Token does not exist');
                  
                  console.error(`❌ Failed to calculate yield for property #${prop.tokenId}:`, {
                    error: errorMsg,
                    isRevert,
                    isRWAError,
                    propertyLinkedToRWA: !!(prop.rwaContract && prop.rwaTokenId),
                    rwaContract: prop.rwaContract,
                    rwaTokenId: prop.rwaTokenId,
                    note: isRWAError ? 'RWA contract call may be failing - using fallback calculation' : 'Contract call failed - using fallback calculation',
                  });
                  
                  // Fallback: Calculate yield manually using same logic as contract
                  // No threshold blocking - any amount > 0 is claimable per contract
                  if (isClaimable && prop.createdAt) {
                    try {
                      // Fetch RWA data if property is linked to RWA
                      let valueToUse = prop.value;
                      let yieldRateToUse = prop.yieldRate;
                      
                      if (prop.rwaContract && prop.rwaContract !== '0x0000000000000000000000000000000000000000' && prop.rwaTokenId !== undefined) {
                        try {
                          const publicClient = getPublicClient(config);
                          if (publicClient) {
                            const RWA_ABI = [
                              {
                                inputs: [{ name: '', type: 'uint256' }],
                                name: 'properties',
                                outputs: [
                                  { name: 'name', type: 'string' },
                                  { name: 'value', type: 'uint256' },
                                  { name: 'monthlyYield', type: 'uint256' },
                                  { name: 'location', type: 'string' },
                                  { name: 'createdAt', type: 'uint256' },
                                  { name: 'isActive', type: 'bool' },
                                ],
                                stateMutability: 'view',
                                type: 'function',
                              },
                              {
                                inputs: [{ name: 'tokenId', type: 'uint256' }],
                                name: 'getYieldRate',
                                outputs: [{ name: '', type: 'uint256' }],
                                stateMutability: 'view',
                                type: 'function',
                              },
                            ] as const;
                            
                            const rwaProperty = await publicClient.readContract({
                              address: prop.rwaContract as `0x${string}`,
                              abi: RWA_ABI,
                              functionName: 'properties',
                              args: [BigInt(prop.rwaTokenId)],
                            }) as [string, bigint, bigint, string, bigint, boolean];
                            
                            const rwaYieldRate = await publicClient.readContract({
                              address: prop.rwaContract as `0x${string}`,
                              abi: RWA_ABI,
                              functionName: 'getYieldRate',
                              args: [BigInt(prop.rwaTokenId)],
                            }) as bigint;
                            
                            const [rwaName, rwaValue, rwaMonthlyYield, rwaLocation, rwaCreatedAt, rwaIsActive] = rwaProperty;
                            
                            if (rwaIsActive && rwaValue > BigInt(0) && rwaYieldRate > BigInt(0)) {
                              valueToUse = rwaValue;
                              yieldRateToUse = Number(rwaYieldRate);
                              console.log(`✅ Fallback: Property #${prop.tokenId} using RWA data (${Number(rwaValue) / 1e18} TYCOON, ${Number(rwaYieldRate) / 100}% APY)`);
                            }
                          }
                        } catch (rwaError) {
                          console.warn(`⚠️ Fallback: Failed to fetch RWA data for property #${prop.tokenId}, using property data`);
                        }
                      }
                      
                      // Calculate yield using contract's formula
                      // dailyYield = (value * yieldRate) / (365 * 10000)
                      const yieldRateBigInt = BigInt(Math.floor(yieldRateToUse));
                      const dailyYield = (valueToUse * yieldRateBigInt) / BigInt(365 * 10000);
                      
                      // periods = timeElapsed / YIELD_UPDATE_INTERVAL
                      // timeElapsed is already a BigInt from above
                      const periods = timeElapsed / yieldUpdateInterval;
                      
                      // Cap periods to 365 (same as contract)
                      const periodsCapped = periods > BigInt(365) ? BigInt(365) : periods;
                      
                      // claimable = pendingYield + (dailyYield * periods)
                      // pendingYield is 0 for new properties, so: claimable = dailyYield * periods
                      claimable = dailyYield * periodsCapped;
                      
                      console.log(`✅ Fallback: Calculated claimable yield for property #${prop.tokenId}: ${claimable.toString()} wei (${Number(claimable) / 1e18} TYCOON)`, {
                        value: `${Number(valueToUse) / 1e18} TYCOON`,
                        yieldRate: `${yieldRateToUse / 100}% APY`,
                        dailyYield: `${Number(dailyYield) / 1e18} TYCOON`,
                        periods: periodsCapped.toString(),
                        timeElapsedHours: timeElapsedHours.toFixed(2),
                      });
                    } catch (fallbackError) {
                      console.error(`❌ Fallback calculation also failed for property #${prop.tokenId}:`, fallbackError);
                      claimable = BigInt(0);
                    }
                  } else {
                    console.warn(`⚠️ Property #${prop.tokenId}: Not claimable yet (${hoursRemaining}h ${minutesRemaining}m remaining), skipping fallback calculation`);
                  }
                }
                claimableYieldsMap.set(prop.tokenId, claimable);
                return claimable;
              } catch (error) {
                claimableYieldsMap.set(prop.tokenId, BigInt(0));
                timeRemainingMap.set(prop.tokenId, { hours: 0, minutes: 0, isClaimable: false });
                return BigInt(0);
              }
            });
            const claimableYields = await Promise.all(claimablePromises);
            totalClaimable = claimableYields.reduce((sum, y) => sum + y, BigInt(0));
            
            // Validate totalClaimable before setting (prevent showing corrupted values)
            // Max reasonable yield: 1,000,000 TYCOON = 1e24 wei (allows for high-value RWA properties)
            const MAX_REASONABLE_YIELD = BigInt('1000000000000000000000000'); // 1,000,000 TYCOON
            if (totalClaimable > MAX_REASONABLE_YIELD) {
              console.warn('⚠️ Total claimable yield is suspiciously large, resetting to 0:', totalClaimable.toString());
              setClaimableYield(BigInt(0));
            } else {
              setClaimableYield(totalClaimable);
            }
            setPropertyClaimableYields(claimableYieldsMap);
            
            // Store time remaining map for display
            (window as any).propertyTimeRemaining = timeRemainingMap;
            
            console.log(`💰 Total claimable yield: ${totalClaimable.toString()} wei (${Number(totalClaimable) / 1e18} TYCOON)`);
            
            // Calculate estimated yield from blockchain data (real-time) - WITH VERIFICATION
            // IMPORTANT: Uses RWA data when property is linked to RWA
            let totalPending = BigInt(0);
            const now = Date.now();
            
            console.log('🔍 YIELD CALCULATION VERIFICATION:');
            const YIELD_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (from YieldDistributor.sol line 17)
            
            // RWA ABI for fetching RWA data (matches MockRWA.sol struct)
            // Use 'properties' public mapping instead of 'getRWAProperty' for better viem compatibility
            const RWA_ABI = [
              {
                inputs: [{ name: '', type: 'uint256' }],
                name: 'properties',
                outputs: [
                  { name: 'name', type: 'string' },
                  { name: 'value', type: 'uint256' },
                  { name: 'monthlyYield', type: 'uint256' },
                  { name: 'location', type: 'string' },
                  { name: 'createdAt', type: 'uint256' },
                  { name: 'isActive', type: 'bool' },
                ],
                stateMutability: 'view',
                type: 'function',
              },
              {
                inputs: [{ name: 'tokenId', type: 'uint256' }],
                name: 'getYieldRate',
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function',
              },
            ] as const;
            
            for (const prop of mappedProperties) {
              if (prop.createdAt) {
                const timeElapsedMs = now - prop.createdAt.getTime();
                const timeElapsedSeconds = timeElapsedMs / 1000;
                const timeElapsedHours = timeElapsedSeconds / 3600;
                const timeElapsedDays = timeElapsedHours / 24;
                const timeRemainingMs = YIELD_UPDATE_INTERVAL_MS - timeElapsedMs;
                const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);
                const isClaimable = timeElapsedMs >= YIELD_UPDATE_INTERVAL_MS;
                
                if (timeElapsedSeconds > 0) {
                  let valueToUse = prop.value;
                  let yieldRateToUse = prop.yieldRate;
                  let yieldSource = 'PROPERTY';
                  
                  // Check if property is linked to RWA - use RWA data for yield calculation
                  if (prop.rwaContract && prop.rwaContract !== '0x0000000000000000000000000000000000000000' && prop.rwaTokenId !== undefined) {
                    try {
                      const publicClient = getPublicClient(config);
                      if (publicClient) {
                        // Fetch RWA property data using 'properties' public mapping (more reliable with viem)
                        const rwaProperty = await publicClient.readContract({
                          address: prop.rwaContract as `0x${string}`,
                          abi: RWA_ABI,
                          functionName: 'properties',
                          args: [BigInt(prop.rwaTokenId)],
                        }) as [string, bigint, bigint, string, bigint, boolean];
                        
                        // Fetch RWA yield rate
                        const rwaYieldRate = await publicClient.readContract({
                          address: prop.rwaContract as `0x${string}`,
                          abi: RWA_ABI,
                          functionName: 'getYieldRate',
                          args: [BigInt(prop.rwaTokenId)],
                        }) as bigint;
                        
                        const [rwaName, rwaValue, rwaMonthlyYield, rwaLocation, rwaCreatedAt, rwaIsActive] = rwaProperty;
                        
                        if (rwaIsActive && rwaValue > BigInt(0) && rwaYieldRate > BigInt(0)) {
                          valueToUse = rwaValue;
                          yieldRateToUse = Number(rwaYieldRate);
                          yieldSource = 'RWA';
                          console.log(`✅ Property #${prop.tokenId}: Using RWA data for yield calculation`, {
                            rwaContract: prop.rwaContract,
                            rwaTokenId: prop.rwaTokenId,
                            rwaName,
                            rwaValue: `${Number(rwaValue) / 1e18} TYCOON`,
                            rwaYieldRate: `${Number(rwaYieldRate) / 100}% APY`,
                            rwaIsActive,
                          });
                        } else {
                          console.warn(`⚠️ Property #${prop.tokenId}: RWA linked but inactive or invalid, using property data`, {
                            rwaIsActive,
                            rwaValue: rwaValue.toString(),
                            rwaYieldRate: rwaYieldRate.toString(),
                          });
                        }
                      }
                    } catch (error) {
                      console.warn(`⚠️ Property #${prop.tokenId}: Failed to fetch RWA data, using property data:`, error);
                    }
                  }
                  
                  const yieldRateBigInt = BigInt(Math.floor(yieldRateToUse));
                  // Daily yield formula: (value * yieldRate) / (365 * 10000)
                  // yieldRate is in basis points (500 = 5% APY)
                  const dailyYield = (valueToUse * yieldRateBigInt) / BigInt(365 * 10000);
                  const secondsPerDay = 86400;
                  const yieldPerSecond = dailyYield / BigInt(secondsPerDay);
                  const maxSeconds = 365 * secondsPerDay;
                  const secondsToCalculate = Math.min(timeElapsedSeconds, maxSeconds);
                  const propertyEstimatedYield = yieldPerSecond * BigInt(Math.floor(secondsToCalculate));
                  totalPending += propertyEstimatedYield;
                  
                  // Verification logging
                  console.log(`  Property #${prop.tokenId} (${prop.propertyType}):`, {
                    yieldSource: yieldSource,
                    value: `${Number(valueToUse) / 1e18} TYCOON ${yieldSource === 'RWA' ? '(from RWA)' : '(from property)'}`,
                    yieldRate: `${yieldRateToUse / 100}% APY ${yieldSource === 'RWA' ? '(from RWA)' : '(from property)'}`,
                    createdAt: prop.createdAt.toISOString(),
                    elapsed: `${timeElapsedDays.toFixed(2)} days (${timeElapsedHours.toFixed(2)} hours)`,
                    hoursUntilClaimable: isClaimable ? '0 (READY!)' : `${hoursRemaining.toFixed(2)} hours`,
                    isClaimable: isClaimable,
                    dailyYield: `${Number(dailyYield) / 1e18} TYCOON/day`,
                    estimatedYield: `${Number(propertyEstimatedYield) / 1e18} TYCOON`,
                    formula: `(${Number(valueToUse) / 1e18} × ${yieldRateToUse / 100}%) / 365 days × ${timeElapsedDays.toFixed(2)} days`,
                    note: yieldSource === 'RWA' 
                      ? '✅ Using RWA yield (real rental income)' 
                      : 'Contract requires 24 hours (YIELD_UPDATE_INTERVAL) before yield becomes claimable',
                  });
                }
              }
            }
            
            console.log(`✅ Total estimated yield: ${totalPending.toString()} wei (${Number(totalPending) / 1e18} TYCOON)`);
            setTotalPendingYield(totalPending);
            setIsLoading(false);
            return; // Successfully loaded from backend
          }
        }
      } catch (error) {
        console.warn('⚠️ Backend unavailable, falling back to blockchain:', error);
      }
      
      // Fallback to blockchain if backend fails
      console.log('🔄 Falling back to blockchain loading...');
      
      // Get token IDs directly from contract
      let tokenIds: readonly bigint[] | bigint[] = [];
      try {
        const fetchedIds = await getOwnerProperties(address as `0x${string}`);
        tokenIds = Array.isArray(fetchedIds) ? [...fetchedIds] : [];
      
      if (tokenIds.length === 0) {
          setProperties([]);
          setTotalPendingYield(BigInt(0));
          setTotalYieldEarned(BigInt(0));
          setIsLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('❌ Failed to get owner properties from contract:', error);
        setProperties([]);
        setTotalPendingYield(BigInt(0));
        setTotalYieldEarned(BigInt(0));
        setIsLoading(false);
        return;
      }
      
      // Deduplicate tokenIds
      const uniqueTokenIds = Array.from(new Set(tokenIds.map(id => Number(id))));
      
      // Filter out listed properties by checking ownerOf for each property
      // Listed properties are owned by the marketplace contract
      const marketplaceAddress = CONTRACTS.Marketplace.toLowerCase();
      const ownedTokenIds: number[] = [];
      
      console.log(`🔍 Checking ownership for ${uniqueTokenIds.length} properties...`);
      for (const tokenId of uniqueTokenIds) {
        try {
          const currentOwner = await readContract(config, {
            address: CONTRACTS.PropertyNFT,
            abi: PROPERTY_NFT_ABI,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          }) as `0x${string}`;
          
          const ownerLower = currentOwner.toLowerCase();
          const isOwnedByUser = ownerLower === address.toLowerCase();
          const isListed = ownerLower === marketplaceAddress;
          
          console.log(`Property ${tokenId}: owner=${currentOwner}, isOwnedByUser=${isOwnedByUser}, isListed=${isListed}`);
          
          if (isOwnedByUser && !isListed) {
            ownedTokenIds.push(tokenId);
            console.log(`✅ Property ${tokenId} is owned by user`);
          } else {
            console.log(`❌ Property ${tokenId} excluded: ${isListed ? 'listed (owned by marketplace)' : 'owned by different address'}`);
          }
      } catch (error) {
          console.warn(`Failed to check ownerOf for property ${tokenId}:`, error);
          // If ownerOf fails, include it (better to show than hide)
          ownedTokenIds.push(tokenId);
        }
      }
      
      console.log(`✅ Filtered to ${ownedTokenIds.length} properties actually owned by user (excluded ${uniqueTokenIds.length - ownedTokenIds.length} listed/transferred)`);
      
      // Map properties from blockchain (only owned ones)
      const mappedProperties: Property[] = await Promise.all(
        ownedTokenIds.map(async (tokenId: number, index: number) => {
          try {
            const propData = await readContract(config, {
            address: CONTRACTS.PropertyNFT,
            abi: PROPERTY_NFT_ABI,
            functionName: 'getProperty',
            args: [BigInt(tokenId)],
            }) as {
              propertyType: bigint | number;
              value: bigint;
              yieldRate: bigint;
              rwaContract: string;
              rwaTokenId: bigint;
              totalYieldEarned: bigint;
              createdAt: bigint;
              isActive: boolean;
            };

            // Convert yieldRate
          const yieldRateRaw = propData.yieldRate;
          const yieldRateBigInt = typeof yieldRateRaw === 'bigint' 
            ? yieldRateRaw 
            : BigInt(String(yieldRateRaw));
          let yieldRateValue = Number(yieldRateBigInt);
          
          if (yieldRateValue < 100 && yieldRateValue > 0) {
            yieldRateValue = yieldRateValue * 100;
          } else if (yieldRateValue > 1e15) {
            yieldRateValue = Number(yieldRateBigInt) / 1e18 * 100;
          }
          
          if (yieldRateValue < 100) {
              yieldRateValue = 500;
            }

            // Convert createdAt from BigInt (seconds) to Date
            // Contract stores block.timestamp (Unix timestamp in seconds)
            const createdAtTimestamp = Number(propData.createdAt);
            const createdAtDate = new Date(createdAtTimestamp * 1000); // Convert seconds to milliseconds
            
            // Verify timestamp is reasonable (not in the future, not too old)
            const now = Date.now();
            const createdAtMs = createdAtDate.getTime();
            const timeDiff = now - createdAtMs;
            
            if (timeDiff < 0) {
              console.warn(`⚠️ Property #${tokenId}: createdAt is in the future! Contract timestamp: ${createdAtTimestamp}, Date: ${createdAtDate.toISOString()}`);
            } else if (timeDiff > 365 * 24 * 60 * 60 * 1000) {
              console.warn(`⚠️ Property #${tokenId}: createdAt is more than 1 year old! Contract timestamp: ${createdAtTimestamp}, Date: ${createdAtDate.toISOString()}`);
            }
            
            // Try to verify against blockchain event (optional, for verification)
            let eventBlockTimestamp: number | null = null;
            try {
              const publicClient = getPublicClient(config);
              if (publicClient) {
                // Query PropertyCreated event for this tokenId
                const events = await publicClient.getLogs({
                  address: CONTRACTS.PropertyNFT,
                  event: parseAbiItem('event PropertyCreated(uint256 indexed tokenId, address indexed owner, uint8 propertyType, uint256 value)'),
                  args: {
                    tokenId: BigInt(tokenId),
                  },
                  fromBlock: 0n,
                });
                
                if (events.length > 0) {
                  // Get the block timestamp from the event
                  const block = await getBlock(config, { blockNumber: events[0].blockNumber });
                  eventBlockTimestamp = Number(block.timestamp);
                  console.log(`🔍 Property #${tokenId} event verification:`, {
                    eventBlockNumber: events[0].blockNumber.toString(),
                    eventBlockTimestamp: eventBlockTimestamp,
                    eventBlockDate: new Date(eventBlockTimestamp * 1000).toISOString(),
                    contractCreatedAt: createdAtTimestamp,
                    contractCreatedAtDate: createdAtDate.toISOString(),
                    match: eventBlockTimestamp === createdAtTimestamp ? '✅ MATCH' : '❌ MISMATCH',
                    difference: eventBlockTimestamp !== createdAtTimestamp ? `${Math.abs(eventBlockTimestamp - createdAtTimestamp)} seconds` : '0 seconds',
                  });
                }
              }
            } catch (error) {
              // Event query failed - that's okay, we'll use contract timestamp
              console.log(`ℹ️ Property #${tokenId}: Could not verify via event (non-critical):`, error);
            }
            
            console.log(`📅 Property #${tokenId} timestamp from contract:`, {
              contractTimestamp: createdAtTimestamp,
              contractTimestampHex: `0x${createdAtTimestamp.toString(16)}`,
              convertedDate: createdAtDate.toISOString(),
              currentTime: new Date().toISOString(),
              elapsedHours: (timeDiff / (1000 * 60 * 60)).toFixed(2),
              elapsedDays: (timeDiff / (1000 * 60 * 60 * 24)).toFixed(2),
              note: 'This timestamp is set once during minting and is immutable (see PropertyNFT.sol line 51)',
            });

            const property = {
            id: `prop-${tokenId}`,
            tokenId: tokenId,
            propertyType: ['Residential', 'Commercial', 'Industrial', 'Luxury'][Number(propData.propertyType)] as Property['propertyType'],
            value: BigInt(propData.value.toString()),
              yieldRate: yieldRateValue,
            totalYieldEarned: BigInt(propData.totalYieldEarned.toString()),
              createdAt: createdAtDate, // Store creation date for yield calculation
              x: index % 10,
              y: Math.floor(index / 10),
            rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' ? propData.rwaContract : undefined,
            rwaTokenId: propData.rwaTokenId ? Number(propData.rwaTokenId) : undefined,
              isOwned: true,
            };
            
            return property;
          } catch (error) {
            console.error(`❌ Failed to load property ${tokenId}:`, error);
            return {
              id: `prop-${tokenId}`,
              tokenId: tokenId,
              propertyType: 'Residential' as Property['propertyType'],
              value: BigInt(0),
              yieldRate: 500,
              totalYieldEarned: BigInt(0),
              x: index % 10,
              y: Math.floor(index / 10),
              isOwned: true,
            };
          }
        })
      );

      // Filter out any failed properties (shouldn't happen, but just in case)
      const validProperties = mappedProperties.filter(p => p !== null && p.value > 0);
      console.log(`✅ Successfully loaded ${validProperties.length} properties from blockchain`);
      
      // Calculate claimable yield from contract (requires 24 hours) - PER PROPERTY
      let totalClaimable = BigInt(0);
      const claimableYieldsMap = new Map<number, bigint>();
      const claimablePromises = validProperties.map(async (prop) => {
        try {
          const yieldPromise = calculateYield(BigInt(prop.tokenId));
          const timeoutPromise = new Promise<bigint>((_, reject) => {
            setTimeout(() => reject(new Error('calculateYield timeout')), 10000); // 10 second timeout
          });
          const yieldAmount = await Promise.race([yieldPromise, timeoutPromise]);
          const claimable = typeof yieldAmount === 'bigint' ? yieldAmount : BigInt(yieldAmount?.toString() || '0');
          console.log(`📊 Property #${prop.tokenId} claimable yield from contract: ${claimable.toString()} wei (${Number(claimable) / 1e18} TYCOON)`);
          claimableYieldsMap.set(prop.tokenId, claimable);
          return claimable;
        } catch (error: any) {
          console.error(`❌ Failed to calculate yield for property #${prop.tokenId}:`, error?.message || error);
          claimableYieldsMap.set(prop.tokenId, BigInt(0));
          return BigInt(0);
        }
      });
      const claimableYields = await Promise.all(claimablePromises);
      totalClaimable = claimableYields.reduce((sum, y) => sum + y, BigInt(0));
      setClaimableYield(totalClaimable);
      setPropertyClaimableYields(claimableYieldsMap);
      console.log(`💰 Total claimable yield: ${totalClaimable.toString()} wei (${Number(totalClaimable) / 1e18} TYCOON)`);
      
      // Calculate estimated yield directly from blockchain data (real-time, works even if backend is down)
      // This calculates yield based on time elapsed since property creation - WITH VERIFICATION
      let totalPending = BigInt(0);
      const now = Date.now();
      
      console.log('🔍 YIELD CALCULATION VERIFICATION (Blockchain Path):');
      for (const prop of validProperties) {
        if (prop.createdAt) {
          const timeElapsedMs = now - prop.createdAt.getTime();
          const timeElapsedSeconds = timeElapsedMs / 1000;
          const timeElapsedHours = timeElapsedSeconds / 3600;
          const timeElapsedDays = timeElapsedHours / 24;
          
          if (timeElapsedSeconds > 0) {
            // Calculate daily yield: (value * yieldRate) / (365 * 10000)
            // yieldRate is in basis points (500 = 5% APY)
            const yieldRateBigInt = BigInt(Math.floor(prop.yieldRate));
            const dailyYield = (prop.value * yieldRateBigInt) / BigInt(365 * 10000);
            const secondsPerDay = 86400;
            const yieldPerSecond = dailyYield / BigInt(secondsPerDay);
            
            // Calculate estimated yield for elapsed seconds (cap at 365 days)
            const maxSeconds = 365 * secondsPerDay;
            const secondsToCalculate = Math.min(timeElapsedSeconds, maxSeconds);
            const propertyEstimatedYield = yieldPerSecond * BigInt(Math.floor(secondsToCalculate));
            totalPending += propertyEstimatedYield;
            
            // Verification logging
            const claimableForProp = claimableYieldsMap.get(prop.tokenId) || BigInt(0);
            console.log(`  Property #${prop.tokenId} (${prop.propertyType}):`, {
              value: `${Number(prop.value) / 1e18} TYCOON`,
              yieldRate: `${prop.yieldRate / 100}% APY`,
              createdAt: prop.createdAt.toISOString(),
              elapsed: `${timeElapsedDays.toFixed(2)} days (${timeElapsedHours.toFixed(2)} hours)`,
              dailyYield: `${Number(dailyYield) / 1e18} TYCOON/day`,
              estimatedYield: `${Number(propertyEstimatedYield) / 1e18} TYCOON`,
              claimableYield: `${Number(claimableForProp) / 1e18} TYCOON`,
              formula: `(${Number(prop.value) / 1e18} × ${prop.yieldRate / 100}%) / 365 days × ${timeElapsedDays.toFixed(2)} days`,
            });
          }
        }
      }
      
      console.log(`✅ Total estimated yield: ${totalPending.toString()} wei (${Number(totalPending) / 1e18} TYCOON)`);
      
      // Try backend for additional data (optional, non-blocking)
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const yieldResponse = await fetch(`${BACKEND_URL}/yield/pending/${address}`, {
          signal: AbortSignal.timeout(2000), // 2 second timeout (non-blocking)
        });
        
        if (yieldResponse.ok) {
          const yieldData = await yieldResponse.json();
          const backendYield = BigInt(yieldData.totalPending || '0');
          // Use backend value if it's higher (more accurate) or if our calculation is 0
          if (backendYield > totalPending || totalPending === BigInt(0)) {
            totalPending = backendYield;
            console.log(`💰 Using backend yield: ${yieldData.formatted} TYCOON`);
          }
        }
      } catch (error) {
        // Backend unavailable - that's okay, we have blockchain calculation
        console.log('ℹ️ Backend yield unavailable, using blockchain calculation');
      }
      
      setTotalPendingYield(totalPending);
      
      console.log(`📊 Properties breakdown:`, {
        total: mappedProperties.length,
        valid: validProperties.length,
        invalid: mappedProperties.length - validProperties.length,
        propertyDetails: validProperties.map(p => ({
          tokenId: p.tokenId,
          type: p.propertyType,
          value: p.value.toString(),
        })),
      });

      if (validProperties.length === 0 && mappedProperties.length > 0) {
        console.warn('⚠️ All properties were filtered out! Check property values:', mappedProperties);
      }

      setProperties(validProperties);

      // Calculate total earned
      const totalEarned = validProperties.reduce((sum, p) => sum + p.totalYieldEarned, BigInt(0));
      setTotalYieldEarned(totalEarned);
      
      console.log(`💰 Total pending yield: ${totalPending.toString()}, Total earned: ${totalEarned.toString()}`);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);
  
  // Load token balance using wagmi hook (reactive)
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.GameToken,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Update token balance value when data changes
  useEffect(() => {
    if (tokenBalance !== undefined) {
      const balance = BigInt(tokenBalance.toString());
      console.log('💰 Token balance updated:', balance.toString());
      setTokenBalanceValue(balance);
    } else if (address) {
      // If address exists but balance is undefined, try manual fetch
      const loadBalance = async () => {
        try {
          const balance = await readContract(config, {
        address: CONTRACTS.GameToken,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [address],
          }) as bigint;
          console.log('💰 Manual balance fetch:', balance.toString());
      setTokenBalanceValue(BigInt(balance.toString()));
    } catch (error) {
          console.error('❌ Failed to load token balance:', error);
      setTokenBalanceValue(BigInt(0));
    }
      };
      loadBalance();
    }
  }, [tokenBalance, address]);

  // Mint property transaction
  const { writeContract: writeMint, data: mintHash, isPending: isMintPending } = useWriteContract();
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  
  // Check TYCOON token allowance
  const { data: tokenAllowance } = useReadContract({
    address: CONTRACTS.GameToken,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PropertyNFT] : undefined,
    query: { enabled: !!address },
  });
  
  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  
  // Auto-purchase property after approval succeeds
  useEffect(() => {
    if (isApproveSuccess && pendingPropertyType && address) {
      const propertyTypes: Record<string, number> = {
        Residential: 0,
        Commercial: 1,
        Industrial: 2,
        Luxury: 3,
      };
      
      const propertyCosts: Record<string, bigint> = {
        Residential: parseEther('100'),
        Commercial: parseEther('200'),
        Industrial: parseEther('500'),
        Luxury: parseEther('1000'),
      };
      
      const yieldRates: Record<string, bigint> = {
        Residential: BigInt(500),
        Commercial: BigInt(800),
        Industrial: BigInt(1200),
        Luxury: BigInt(1500),
      };
      
      console.log(`Approval successful, purchasing ${pendingPropertyType} property...`);
      writeMint({
        address: CONTRACTS.PropertyNFT,
        abi: PROPERTY_NFT_ABI,
        functionName: 'purchaseProperty',
        args: [propertyTypes[pendingPropertyType], propertyCosts[pendingPropertyType], yieldRates[pendingPropertyType]],
      });
      setPendingPropertyType(null);
      setShowBuildMenu(false);
    }
  }, [isApproveSuccess, pendingPropertyType, address, writeMint]);
  
  // Claim yield transaction
  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract();

  // Wait for mint transaction
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Wait for claim transaction
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // Reload properties when mint succeeds and assign coordinates automatically
  useEffect(() => {
    if (isMintSuccess) {
      const refreshData = async () => {
        // Wait for event indexer to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh properties to get the new one
        await loadProperties();
        
        // Get the latest property token ID and assign coordinates automatically
        try {
          const tokenIds = await getOwnerProperties(address as `0x${string}`);
          if (tokenIds.length > 0) {
            const latestTokenId = Number(tokenIds[tokenIds.length - 1]);
            
            // Find next available position on the map (simple grid placement)
            // Use index-based positioning (NO BACKEND NEEDED)
            const propertyCount = properties.length;
            const x = propertyCount % 10;
            const y = Math.floor(propertyCount / 10);
            
                  console.log(`Auto-placed property ${latestTokenId} at (${x}, ${y})`);
            
            // Optionally save coordinates to backend (non-blocking)
            api.put(`/properties/${latestTokenId}/coordinates`, { x, y }).catch(() => {
              // Backend unavailable - that's okay, we use index-based positioning
            });
          }
        } catch (error) {
          console.error('Failed to assign coordinates:', error);
        }
        
        // Refresh balance
        refetchBalance();
        await new Promise(resolve => setTimeout(resolve, 1000));
        refetchBalance();
        
        // Reload properties again to show the new position
        await loadProperties();
      };
      
      refreshData();
      setIsMinting(false);
    }
  }, [isMintSuccess, address, loadProperties, refetchBalance]);

  // Reload properties when claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      loadProperties();
      refetchBalance();
      setIsClaiming(false);
    }
  }, [isClaimSuccess, loadProperties, refetchBalance]);
  
  // Load properties on mount and when address changes
  useEffect(() => {
    if (address && isConnected) {
      console.log('Loading properties on mount/address change');
      loadProperties();
    }
  }, [address, isConnected, loadProperties]);

  // Refetch balance when address changes
  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, refetchBalance]);

  // WebSocket for real-time updates (replaces periodic refresh)
  useEffect(() => {
    if (!address || !isConnected) return;

    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
      : 'http://localhost:3001';

    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket for real-time updates');
      // Subscribe to portfolio updates for this address
      socket.emit('subscribe:portfolio', { address });
      console.log(`📡 Subscribed to portfolio: ${address}`);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    // Listen for property created events
    socket.on('property:created', (data: { propertyId: string; owner: string; propertyType: string }) => {
      if (data.owner.toLowerCase() === address?.toLowerCase()) {
        console.log('📦 New property created, refreshing...');
        loadProperties();
        refetchBalance();
      }
    });

    // Listen for yield claimed events
    socket.on('yield:claimed', (data: { propertyId: string; owner: string; amount: string }) => {
      if (data.owner.toLowerCase() === address?.toLowerCase()) {
        console.log('💰 Yield claimed, refreshing...');
        loadProperties();
        refetchBalance();
      }
    });

    // Listen for yield time updates (real-time countdown from backend)
    socket.on('yield:time-update', (data: {
      walletAddress: string;
      yieldUpdateIntervalSeconds: number;
      currentBlockTimestamp: number;
      shortestTimeRemaining: { hours: number; minutes: number } | null;
      totalClaimableYield: string;
      properties: Array<{
        tokenId: number;
        lastYieldUpdate: number;
        createdAt: number;
        timeElapsedSeconds: number;
        timeElapsedHours: number;
        hoursRemaining: number;
        minutesRemaining: number;
        isClaimable: boolean;
        claimableYield: string;
      }>;
    }) => {
      console.log('📨 Received yield:time-update event:', {
        receivedAddress: data.walletAddress,
        currentAddress: address,
        match: data.walletAddress.toLowerCase() === address?.toLowerCase(),
        propertiesCount: data.properties.length,
      });
      
      if (data.walletAddress.toLowerCase() === address?.toLowerCase()) {
        console.log('⏰ Yield time update received from backend:', data);
        
        // Update claimable yield from backend (more reliable than blockchain calls)
        const claimable = BigInt(data.totalClaimableYield || '0');
        const currentClaimable = claimableYield; // Get current claimable yield from state
        
        console.log(`💰 WebSocket: Received claimable yield from backend: ${claimable.toString()} wei (${Number(claimable) / 1e18} TYCOON)`, {
          totalClaimableYield: data.totalClaimableYield,
          propertiesCount: data.properties.length,
          claimableProperties: data.properties.filter(p => BigInt(p.claimableYield || '0') > BigInt(0)).length,
          currentFrontendClaimable: currentClaimable.toString(),
          note: claimable === BigInt(0) ? 'Backend returned 0 (contract may be reverting) - will preserve frontend fallback if available' : 'Backend has valid yield',
        });
        
        // Validate claimable yield from backend (prevent showing corrupted values)
        const MAX_REASONABLE_YIELD = BigInt('1000000000000000000000000'); // 1,000,000 TYCOON (allows for high-value RWA properties)
        if (claimable > MAX_REASONABLE_YIELD) {
          console.warn('⚠️ Backend returned suspiciously large claimable yield, resetting to 0:', claimable.toString());
          // Don't overwrite if we have a valid frontend calculation
          if (currentClaimable === BigInt(0) || currentClaimable > MAX_REASONABLE_YIELD) {
            setClaimableYield(BigInt(0));
          }
        } else if (claimable > BigInt(0)) {
          // Backend has valid yield - use it
          setClaimableYield(claimable);
          console.log(`✅ WebSocket: Claimable yield updated successfully to ${Number(claimable) / 1e18} TYCOON`);
        } else {
          // Backend returned 0 (contract likely reverting)
          // Only update if frontend also has 0 (no fallback calculation yet)
          // Otherwise, preserve the frontend's fallback calculation
          if (currentClaimable === BigInt(0)) {
            console.log(`⚠️ WebSocket: Backend returned 0, frontend also has 0 - keeping 0`);
            setClaimableYield(BigInt(0));
          } else {
            console.log(`✅ WebSocket: Backend returned 0 (contract reverting), but preserving frontend fallback calculation: ${Number(currentClaimable) / 1e18} TYCOON`);
            // Don't update - keep the frontend's fallback calculation
          }
        }
        
        // Update property claimable yields map
        // If backend returns 0, recalculate fallback in real-time
        const newClaimableYieldsMap = new Map<number, bigint>();
        const newTimeRemainingMap = new Map<number, { hours: number; minutes: number; isClaimable: boolean }>();
        
        // Recalculate fallback yields if backend returned 0 (contract reverting)
        const needsFallbackRecalculation = claimable === BigInt(0) && data.properties.some(p => BigInt(p.claimableYield || '0') === BigInt(0));
        
        if (needsFallbackRecalculation) {
          console.log('🔄 WebSocket: Backend returned 0, recalculating fallback yields in real-time...');
        }
        
        // Process each property and recalculate fallback if needed (async IIFE)
        (async () => {
          const fallbackPromises = data.properties.map(async (prop) => {
            const backendYield = BigInt(prop.claimableYield || '0');
            let finalYield = backendYield;
            
            // If backend returned 0 and property is claimable, recalculate fallback
            if (backendYield === BigInt(0) && prop.isClaimable && needsFallbackRecalculation) {
              try {
                // Find the property in current properties state
                const currentProp = properties.find(p => p.tokenId === prop.tokenId);
                if (currentProp && currentProp.createdAt) {
                  // Calculate fallback yield using same logic as loadProperties
                  let valueToUse = currentProp.value;
                  let yieldRateToUse = currentProp.yieldRate;
                  
                  // Fetch RWA data if property is linked to RWA
                  if (currentProp.rwaContract && currentProp.rwaContract !== '0x0000000000000000000000000000000000000000' && currentProp.rwaTokenId !== undefined) {
                    try {
                      const publicClient = getPublicClient(config);
                      if (publicClient) {
                        const RWA_ABI = [
                          {
                            inputs: [{ name: '', type: 'uint256' }],
                            name: 'properties',
                            outputs: [
                              { name: 'name', type: 'string' },
                              { name: 'value', type: 'uint256' },
                              { name: 'monthlyYield', type: 'uint256' },
                              { name: 'location', type: 'string' },
                              { name: 'createdAt', type: 'uint256' },
                              { name: 'isActive', type: 'bool' },
                            ],
                            stateMutability: 'view',
                            type: 'function',
                          },
                          {
                            inputs: [{ name: 'tokenId', type: 'uint256' }],
                            name: 'getYieldRate',
                            outputs: [{ name: '', type: 'uint256' }],
                            stateMutability: 'view',
                            type: 'function',
                          },
                        ] as const;
                        
                        const rwaProperty = await publicClient.readContract({
                          address: currentProp.rwaContract as `0x${string}`,
                          abi: RWA_ABI,
                          functionName: 'properties',
                          args: [BigInt(currentProp.rwaTokenId)],
                        }) as [string, bigint, bigint, string, bigint, boolean];
                        
                        const rwaYieldRate = await publicClient.readContract({
                          address: currentProp.rwaContract as `0x${string}`,
                          abi: RWA_ABI,
                          functionName: 'getYieldRate',
                          args: [BigInt(currentProp.rwaTokenId)],
                        }) as bigint;
                        
                        const [rwaName, rwaValue, rwaMonthlyYield, rwaLocation, rwaCreatedAt, rwaIsActive] = rwaProperty;
                        
                        if (rwaIsActive && rwaValue > BigInt(0) && rwaYieldRate > BigInt(0)) {
                          valueToUse = rwaValue;
                          yieldRateToUse = Number(rwaYieldRate);
                        }
                      }
                    } catch (rwaError) {
                      // Use property data if RWA fetch fails
                    }
                  }
                  
                  // Calculate yield using contract's formula
                  const yieldRateBigInt = BigInt(Math.floor(yieldRateToUse));
                  const dailyYield = (valueToUse * yieldRateBigInt) / BigInt(365 * 10000);
                  
                  // Calculate periods from time elapsed (use backend's time data)
                  const timeElapsedSeconds = prop.timeElapsedSeconds;
                  const yieldUpdateIntervalSeconds = data.yieldUpdateIntervalSeconds || 86400;
                  const periods = BigInt(Math.floor(timeElapsedSeconds / yieldUpdateIntervalSeconds));
                  const periodsCapped = periods > BigInt(365) ? BigInt(365) : periods;
                  
                  finalYield = dailyYield * periodsCapped;
                  
                  if (finalYield > BigInt(0)) {
                    console.log(`✅ WebSocket: Recalculated fallback yield for property #${prop.tokenId}: ${Number(finalYield) / 1e18} TYCOON (real-time update, no refresh needed)`);
                  }
                }
              } catch (fallbackError) {
                console.warn(`⚠️ WebSocket: Fallback recalculation failed for property #${prop.tokenId}:`, fallbackError);
              }
            } else if (backendYield > BigInt(0)) {
              // Backend has valid yield - use it
              console.log(`✅ WebSocket: Property #${prop.tokenId} using backend yield: ${Number(backendYield) / 1e18} TYCOON`);
            }
            
            newClaimableYieldsMap.set(prop.tokenId, finalYield);
            newTimeRemainingMap.set(prop.tokenId, {
              hours: prop.hoursRemaining,
              minutes: prop.minutesRemaining,
              isClaimable: prop.isClaimable,
            });
          });
          
          // Wait for all fallback calculations to complete
          await Promise.all(fallbackPromises);
          
          // Calculate total claimable yield from updated map
          const totalClaimableFromMap = Array.from(newClaimableYieldsMap.values()).reduce((sum, y) => sum + y, BigInt(0));
          
          // Update state
          setPropertyClaimableYields(newClaimableYieldsMap);
          (window as any).propertyTimeRemaining = newTimeRemainingMap;
          
          // Update total claimable yield (use recalculated total if backend was 0)
          if (needsFallbackRecalculation && totalClaimableFromMap > BigInt(0)) {
            setClaimableYield(totalClaimableFromMap);
            console.log(`✅ WebSocket: Updated total claimable yield to ${Number(totalClaimableFromMap) / 1e18} TYCOON (from real-time fallback recalculation)`);
          }
          
          // Force re-render of YieldDisplay by updating timestamp
          setYieldUpdateTimestamp(Date.now());
        })();
        
        // Update estimated yield (calculate from backend data with RWA support)
        // Calculate asynchronously since we need to fetch RWA data
        (async () => {
          // Use current properties state - if empty, wait for properties to load
          const currentProperties = properties;
          if (!currentProperties || currentProperties.length === 0) {
            console.log('⚠️ WebSocket: No properties loaded yet, skipping yield calculation');
            return;
          }
          
          let totalEstimated = BigInt(0);
          
          // RWA ABI for fetching RWA data
          const RWA_ABI = [
            {
              inputs: [{ name: '', type: 'uint256' }],
              name: 'properties',
              outputs: [
                { name: 'name', type: 'string' },
                { name: 'value', type: 'uint256' },
                { name: 'monthlyYield', type: 'uint256' },
                { name: 'location', type: 'string' },
                { name: 'createdAt', type: 'uint256' },
                { name: 'isActive', type: 'bool' },
              ],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [{ name: 'tokenId', type: 'uint256' }],
              name: 'getYieldRate',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ] as const;
          
          // Calculate estimated yield for each property (with RWA support)
          for (const prop of currentProperties) {
            const propData = data.properties.find((p) => p.tokenId === prop.tokenId);
            if (propData && prop.createdAt) {
              let valueToUse = prop.value;
              let yieldRateToUse = prop.yieldRate;
              
              // Check if property is linked to RWA - use RWA data for yield calculation
              if (prop.rwaContract && prop.rwaContract !== '0x0000000000000000000000000000000000000000' && prop.rwaTokenId !== undefined) {
                try {
                  const publicClient = getPublicClient(config);
                  if (publicClient) {
                    // Fetch RWA property data
                    const rwaProperty = await publicClient.readContract({
                      address: prop.rwaContract as `0x${string}`,
                      abi: RWA_ABI,
                      functionName: 'properties',
                      args: [BigInt(prop.rwaTokenId)],
                    }) as [string, bigint, bigint, string, bigint, boolean];
                    
                    // Fetch RWA yield rate
                    const rwaYieldRate = await publicClient.readContract({
                      address: prop.rwaContract as `0x${string}`,
                      abi: RWA_ABI,
                      functionName: 'getYieldRate',
                      args: [BigInt(prop.rwaTokenId)],
                    }) as bigint;
                    
                    const [rwaName, rwaValue, rwaMonthlyYield, rwaLocation, rwaCreatedAt, rwaIsActive] = rwaProperty;
                    
                    if (rwaIsActive && rwaValue > BigInt(0) && rwaYieldRate > BigInt(0)) {
                      valueToUse = rwaValue;
                      yieldRateToUse = Number(rwaYieldRate);
                      console.log(`✅ WebSocket: Property #${prop.tokenId} using RWA yield (${Number(rwaValue) / 1e18} TYCOON, ${Number(rwaYieldRate) / 100}% APY)`);
                    }
                  }
                } catch (error) {
                  // If RWA fetch fails, use property data
                  console.warn(`⚠️ Property #${prop.tokenId}: Failed to fetch RWA data in WebSocket update, using property data:`, error);
                }
              }
              
              // Calculate estimated yield: dailyYield × (timeElapsedHours / 24)
              const dailyYield = (valueToUse * BigInt(yieldRateToUse)) / BigInt(365 * 10000);
              const hoursElapsed = propData.timeElapsedHours;
              const daysElapsed = hoursElapsed / 24;
              const estimatedYield = (dailyYield * BigInt(Math.floor(daysElapsed * 100))) / BigInt(100);
              totalEstimated += estimatedYield;
            }
          }
          
          setTotalPendingYield(totalEstimated);
          console.log(`✅ WebSocket: Updated estimated yield to ${totalEstimated.toString()} wei (${Number(totalEstimated) / 1e18} TYCOON)`);
        })();
        
        console.log('✅ Updated yield data from backend WebSocket:', {
          claimable: claimable.toString(),
          shortestTimeRemaining: data.shortestTimeRemaining,
          propertiesCount: data.properties.length,
        });
      }
    });

    // Listen for portfolio updates
    socket.on('portfolio:updated', () => {
      console.log('📊 Portfolio updated, refreshing...');
      loadProperties();
      refetchBalance();
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, [address, isConnected, loadProperties, refetchBalance]);

  // No periodic refresh - only refresh on:
  // 1. User actions (mint, claim)
  // 2. WebSocket events (real-time updates)
  // This prevents constant loading and improves UX

  // Load other players' properties for multiplayer view (OPTIONAL - backend only)
  // Note: This is for viewing other players' properties on the map
  // Since we're blockchain-first, this is optional and only works if backend has data
  const loadOtherPlayersProperties = useCallback(async () => {
    if (!address) return;
    try {
      // Try to get other players' properties from backend (optional)
      const allProperties = await api.get('/properties').catch(() => []);
      if (allProperties.length === 0) {
        // Backend unavailable or no data - that's okay, we'll just show user's properties
        return;
      }
      
      const otherProps = allProperties
        .filter((p: any) => {
          const ownerAddr = p.owner?.walletAddress || p.owner?.wallet_address;
          return ownerAddr?.toLowerCase() !== address?.toLowerCase();
        })
        .slice(0, 50) // Limit to 50 other properties for performance
        .map((p: any) => {
          const ownerAddr = p.owner?.walletAddress || p.owner?.wallet_address || '';
          // Use coordinates from backend if available, otherwise skip (properties without coordinates aren't placed)
          if (p.x === null || p.x === undefined || p.y === null || p.y === undefined) {
            return null;
          }
          return {
            id: `other-prop-${p.tokenId}`,
            tokenId: Number(p.tokenId),
            propertyType: p.propertyType as Property['propertyType'],
            value: BigInt(p.value?.toString() || '0'),
            yieldRate: Number(p.yieldRate || 0),
            totalYieldEarned: BigInt(p.totalYieldEarned?.toString() || '0'),
            x: Number(p.x),
            y: Number(p.y),
            owner: ownerAddr,
            isOwned: false,
          };
        })
        .filter((p: any) => p !== null); // Remove properties without coordinates
      setOtherPlayersProperties(otherProps);
    } catch (error) {
      console.error('Failed to load other players properties:', error);
      setOtherPlayersProperties([]);
    }
  }, [address]);

  // Load properties on mount and when address changes
  useEffect(() => {
    if (address && isConnected) {
      loadProperties();
      loadOtherPlayersProperties();
    }
  }, [address, isConnected, loadProperties, loadOtherPlayersProperties]);

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to start building your property empire</p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Property Tycoon</h1>
            <p className="text-sm text-gray-400">Build your real estate empire</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowGuide(true)}
              variant="outline"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              How to Play
            </Button>
            <Link href="/leaderboard">
            <Button
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
            </Link>
            <Button
              onClick={() => setShowGuilds(!showGuilds)}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
            >
              <Users className="w-4 h-4 mr-2" />
              Guilds
            </Button>
            <Button
              onClick={() => setShowMarketplace(!showMarketplace)}
              variant="outline"
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
            <Button
              onClick={() => setShowQuests(!showQuests)}
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Target className="w-4 h-4 mr-2" />
              Quests
            </Button>
            <WalletConnect />
            {isConnected && (
              <Button
                onClick={() => setShowProfile(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            )}
            <Button
              onClick={() => setShowChat(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <YieldDisplay
              key={yieldUpdateTimestamp} // Force re-render when WebSocket updates
              totalPendingYield={totalPendingYield}
              claimableYield={claimableYield}
              totalYieldEarned={totalYieldEarned}
              isClaiming={isClaiming || isClaimPending || isClaimConfirming}
              onClaimAll={async () => {
                if (!address || properties.length === 0) return;
                try {
                  setIsClaiming(true);
                  const propertyIds = properties.map(p => BigInt(p.tokenId));
                  console.log('💰 Claiming yield for properties:', propertyIds.map(id => id.toString()));
                  console.log('📋 Property details:', properties.map(p => ({ tokenId: p.tokenId, propertyType: p.propertyType })));
                  writeClaim({
                    address: CONTRACTS.YieldDistributor,
                    abi: YIELD_DISTRIBUTOR_ABI,
                    functionName: 'batchClaimYield',
                    args: [propertyIds],
                  });
                } catch (error) {
                  console.error('Failed to claim yield:', error);
                  setIsClaiming(false);
                }
              }}
            />

            <Button
              onClick={() => setShowTokenPurchase(!showTokenPurchase)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 mb-2"
            >
              <Coins className="w-4 h-4 mr-2" />
              {showTokenPurchase ? 'Close Token Purchase' : 'Buy TYCOON Tokens'}
            </Button>

            {showTokenPurchase && (
              <div className="mb-4">
                <TokenPurchase />
              </div>
            )}

            <Button
              onClick={() => setShowBuildMenu(!showBuildMenu)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Building2 className="w-4 h-4 mr-2" />
              {showBuildMenu ? 'Close Build Menu' : 'Build Property'}
            </Button>

            {showBuildMenu && (
              <BuildMenu
                tokenBalance={tokenBalanceValue}
                isMinting={isMinting || isMintPending || isMintConfirming}
                onBuildProperty={async (type: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury') => {
                  // Mint property immediately without tile selection
                  if (!address) return;
                  
                  const propertyTypes: Record<string, number> = {
                    Residential: 0,
                    Commercial: 1,
                    Industrial: 2,
                    Luxury: 3,
                  };
                  
                  const propertyCosts: Record<string, bigint> = {
                    Residential: parseEther('100'),
                    Commercial: parseEther('200'),
                    Industrial: parseEther('500'),
                    Luxury: parseEther('1000'),
                  };
                  
                  const yieldRates: Record<string, bigint> = {
                    Residential: BigInt(500), // 5% APY in basis points
                    Commercial: BigInt(800), // 8% APY in basis points
                    Industrial: BigInt(1200), // 12% APY in basis points
                    Luxury: BigInt(1500), // 15% APY in basis points
                  };

                  try {
                    setIsMinting(true);
                    const cost = propertyCosts[type];
                    const currentAllowance = (tokenAllowance as bigint) || BigInt(0);
                    
                    // If allowance is insufficient, approve first
                    if (currentAllowance < cost) {
                      console.log(`Approving ${cost.toString()} TYCOON tokens for PropertyNFT...`);
                      setPendingPropertyType(type); // Store property type for auto-purchase after approval
                      writeApprove({
                        address: CONTRACTS.GameToken,
                        abi: [
                          {
                            name: 'approve',
                            type: 'function',
                            stateMutability: 'nonpayable',
                            inputs: [
                              { name: 'spender', type: 'address' },
                              { name: 'amount', type: 'uint256' },
                            ],
                            outputs: [{ name: '', type: 'bool' }],
                          },
                        ],
                        functionName: 'approve',
                        args: [CONTRACTS.PropertyNFT, cost],
                      });
                      // Wait for approval to complete before purchasing
                      // The useEffect hook will handle the purchase after approval succeeds
                      return;
                    }
                    
                    // Purchase property (this will transfer TYCOON tokens and mint NFT)
                    console.log(`Purchasing ${type} property for ${cost.toString()} TYCOON...`);
                    writeMint({
                      address: CONTRACTS.PropertyNFT,
                      abi: PROPERTY_NFT_ABI,
                      functionName: 'purchaseProperty',
                      args: [propertyTypes[type], propertyCosts[type], yieldRates[type]],
                    });
                    setShowBuildMenu(false);
                  } catch (error) {
                    console.error('Failed to purchase property:', error);
                    setIsMinting(false);
                  }
                }}
              />
            )}
          </div>

          {/* Center - City View */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="w-full h-[600px] bg-gray-900 rounded-lg border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
                  <p className="text-gray-400">Loading your portfolio...</p>
                </div>
              </div>
            ) : (
              <CityView
                properties={properties.map(p => ({
                  id: p.id,
                  tokenId: p.tokenId,
                  propertyType: p.propertyType,
                  value: p.value,
                  yieldRate: p.yieldRate,
                  x: p.x,
                  y: p.y,
                }))}
                otherPlayersProperties={otherPlayersProperties}
                onPropertyClick={(property) => {
                  const fullProperty = properties.find(p => p.id === property.id);
                  if (fullProperty) setSelectedProperty(fullProperty);
                }}
                onEmptyTileClick={(x: number, y: number) => {
                  // Empty tile clicks don't do anything now
                  // Properties are minted directly from the build menu
                }}
              />
            )}
          </div>

          {/* Right Sidebar - Property List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-white font-semibold text-lg">Your Properties</h2>
            {properties.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No properties yet</p>
                <p className="text-sm mt-2">Build your first property to get started!</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    claimableYield={propertyClaimableYields.get(property.tokenId)}
                    onViewDetails={() => setSelectedProperty(property)}
                    isClaiming={isClaiming || isClaimPending || isClaimConfirming}
                    onClaimYield={async () => {
                      try {
                        setIsClaiming(true);
                        writeClaim({
                          address: CONTRACTS.YieldDistributor,
                          abi: YIELD_DISTRIBUTOR_ABI,
                          functionName: 'claimYield',
                          args: [BigInt(property.tokenId)],
                        });
                      } catch (error) {
                        console.error('Failed to claim yield:', error);
                        setIsClaiming(false);
                      }
                    }}
                  />
                ))}
              </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </main>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetails
          property={selectedProperty}
          claimableYield={propertyClaimableYields.get(selectedProperty.tokenId)}
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isClaiming={isClaiming || isClaimPending || isClaimConfirming}
          onClaimYield={async () => {
            if (!selectedProperty) return;
            try {
              setIsClaiming(true);
              console.log('💰 Claiming yield for property:', {
                tokenId: selectedProperty.tokenId,
                propertyType: selectedProperty.propertyType,
                claimableYield: propertyClaimableYields.get(selectedProperty.tokenId)?.toString() || '0',
              });
              writeClaim({
                address: CONTRACTS.YieldDistributor,
                abi: YIELD_DISTRIBUTOR_ABI,
                functionName: 'claimYield',
                args: [BigInt(selectedProperty.tokenId)],
              });
              setSelectedProperty(null);
            } catch (error) {
              console.error('Failed to claim yield:', error);
              setIsClaiming(false);
            }
          }}
          onLinkRWA={() => {
            setShowRWALink(true);
          }}
          onSellProperty={() => {
            setPropertyToSell(selectedProperty);
            setShowSellProperty(true);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* RWA Link Modal */}
      {showRWALink && selectedProperty && (
        <RWALinkModal
          isOpen={showRWALink}
          onClose={() => {
            setShowRWALink(false);
            setSelectedProperty(null);
          }}
          propertyTokenId={selectedProperty.tokenId}
          onSuccess={() => {
            // Reload properties to get updated RWA info
            console.log('🔄 RWA linked successfully, reloading properties...');
            // Force reload after a short delay to ensure on-chain data is updated
            setTimeout(() => {
              loadProperties();
            }, 2000);
          }}
        />
      )}

      {/* User Profile */}
      {showProfile && <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />}
      
      {/* Global Chat */}
      <GlobalChat isOpen={showChat} onClose={() => setShowChat(false)} />
      
      {/* Game Guide */}
      <GameGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Guilds Modal */}
      {showGuilds && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuilds(false);
          }}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Guilds</h2>
              <Button onClick={() => setShowGuilds(false)} variant="ghost" size="sm" className="hover:bg-white/10 rounded-full">
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <Guilds />
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Modal */}
      {showMarketplace && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMarketplace(false);
          }}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Marketplace</h2>
              <Button onClick={() => setShowMarketplace(false)} variant="ghost" size="sm" className="hover:bg-white/10 rounded-full">
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <Marketplace />
            </div>
          </div>
        </div>
      )}

      {/* Quests Modal */}
      {showQuests && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQuests(false);
          }}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Quests</h2>
              <Button onClick={() => setShowQuests(false)} variant="ghost" size="sm" className="hover:bg-white/10 rounded-full">
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <Quests />
            </div>
          </div>
        </div>
      )}

      {/* Sell Property Modal */}
      {showSellProperty && propertyToSell && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSellProperty(false);
              setPropertyToSell(null);
            }
          }}
        >
          <div 
            className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Sell Property</h2>
              <Button onClick={() => {
                setShowSellProperty(false);
                setPropertyToSell(null);
              }} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <Marketplace 
                preselectedProperty={{
                  tokenId: propertyToSell.tokenId,
                  propertyType: propertyToSell.propertyType,
                  value: propertyToSell.value,
                }}
                onListed={() => {
                  setShowSellProperty(false);
                  setPropertyToSell(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
