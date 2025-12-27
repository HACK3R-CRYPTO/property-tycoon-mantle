'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CityView } from '@/components/game/CityView';
import { PropertyCard } from '@/components/game/PropertyCard';
import { BuildMenu } from '@/components/game/BuildMenu';
import { YieldDisplay } from '@/components/game/YieldDisplay';
import { PropertyDetails } from '@/components/game/PropertyDetails';
import { GlobalChat } from '@/components/GlobalChat';
import { WalletConnect } from '@/components/WalletConnect';
import { GameGuide } from '@/components/game/GameGuide';
import { Leaderboard } from '@/components/Leaderboard';
import { Guilds } from '@/components/Guilds';
import { Marketplace } from '@/components/Marketplace';
import { Quests } from '@/components/Quests';
import { MessageSquare, Building2, BookOpen, Trophy, Users, ShoppingBag, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOwnerProperties, calculateYield, CONTRACTS, PROPERTY_NFT_ABI, YIELD_DISTRIBUTOR_ABI } from '@/lib/contracts';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/mantle-viem';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Property {
  id: string;
  tokenId: number;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
  value: bigint;
  yieldRate: number;
  totalYieldEarned: bigint;
  x: number;
  y: number;
  rwaContract?: string;
  rwaTokenId?: number;
}

export default function GamePage() {
  const { address, isConnected } = useAccount();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGuilds, setShowGuilds] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showSellProperty, setShowSellProperty] = useState(false);
  const [propertyToSell, setPropertyToSell] = useState<Property | null>(null);
  const [totalPendingYield, setTotalPendingYield] = useState<bigint>(BigInt(0));
  const [totalYieldEarned, setTotalYieldEarned] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tokenBalanceValue, setTokenBalanceValue] = useState<bigint>(BigInt(0));
  const [otherPlayersProperties, setOtherPlayersProperties] = useState<Array<Property & { owner: string; isOwned: boolean }>>([]);

  // Load properties function
  const loadProperties = useCallback(async () => {
    if (!address || !isConnected) return;

    try {
      setIsLoading(true);
      
      // Get token IDs from contract
      const tokenIds = await getOwnerProperties(address as `0x${string}`);
      
      if (tokenIds.length === 0) {
        setProperties([]);
        setTotalPendingYield(BigInt(0));
        setTotalYieldEarned(BigInt(0));
        setIsLoading(false);
        return;
      }
      
      // Deduplicate tokenIds by converting to numbers and using Set
      const uniqueTokenIds = Array.from(new Set(tokenIds.map(id => Number(id))));
      
      // Get properties from backend to get coordinates
      let backendProperties: any[] = [];
      try {
        backendProperties = await api.get(`/properties/owner/${address}`);
      } catch (error) {
        console.error('Failed to load properties from backend:', error);
      }
      
      // Map properties with positions from backend or default
      const mappedProperties: Property[] = await Promise.all(
        uniqueTokenIds.map(async (tokenId: number, index: number) => {
          const propData = await readContract(wagmiConfig, {
            address: CONTRACTS.PropertyNFT,
            abi: PROPERTY_NFT_ABI,
            functionName: 'getProperty',
            args: [BigInt(tokenId)],
          });

          // Find matching backend property for coordinates
          const backendProp = backendProperties.find((p: any) => Number(p.tokenId) === tokenId);

          // Convert yieldRate from basis points (e.g., 500 = 5%)
          // yieldRate is stored as basis points in the contract (500 = 5%)
          // Convert BigInt to number properly
          const yieldRateRaw = propData.yieldRate;
          const yieldRateBigInt = typeof yieldRateRaw === 'bigint' 
            ? yieldRateRaw 
            : BigInt(String(yieldRateRaw));
          let yieldRateValue = Number(yieldRateBigInt);
          
          // Debug: log the raw value to help diagnose issues
          console.log(`Property ${tokenId} raw yieldRate:`, yieldRateValue);
          
          // Ensure it's in basis points format (if somehow stored incorrectly, fix it)
          // If value is less than 100, it might be stored as percentage (5 instead of 500)
          // If value is very large (> 1e15), it might be in wei format
          if (yieldRateValue < 100 && yieldRateValue > 0) {
            // Likely stored as percentage (5), convert to basis points (500)
            yieldRateValue = yieldRateValue * 100;
            console.log(`Converted ${yieldRateValue / 100}% to ${yieldRateValue} basis points`);
          } else if (yieldRateValue > 1e15) {
            // Likely stored in wei format, convert to basis points
            yieldRateValue = Number(yieldRateBigInt) / 1e18 * 100;
            console.log(`Converted from wei to ${yieldRateValue} basis points`);
          }
          // Otherwise, assume it's already in basis points (500 = 5%)
          
          // Final validation: ensure yieldRate is reasonable (between 100 and 10000 basis points = 1% to 100%)
          if (yieldRateValue < 100) {
            console.warn(`Property ${tokenId} has suspiciously low yieldRate: ${yieldRateValue}. Defaulting to 500 (5%)`);
            yieldRateValue = 500; // Default to 5% for Residential
          }

          // Use coordinates from backend if available, otherwise use index-based positioning
          const x = backendProp?.x !== null && backendProp?.x !== undefined 
            ? Number(backendProp.x) 
            : index % 10;
          const y = backendProp?.y !== null && backendProp?.y !== undefined 
            ? Number(backendProp.y) 
            : Math.floor(index / 10);

          return {
            id: `prop-${tokenId}`,
            tokenId: tokenId,
            propertyType: ['Residential', 'Commercial', 'Industrial', 'Luxury'][Number(propData.propertyType)] as Property['propertyType'],
            value: BigInt(propData.value.toString()),
            yieldRate: yieldRateValue, // Store as basis points (500 = 5%)
            totalYieldEarned: BigInt(propData.totalYieldEarned.toString()),
            x: x,
            y: y,
            rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' ? propData.rwaContract : undefined,
            rwaTokenId: propData.rwaTokenId ? Number(propData.rwaTokenId) : undefined,
            isOwned: true, // Mark as owned
          };
        })
      );

      setProperties(mappedProperties);

      // Calculate total pending yield (use unique tokenIds)
      let totalPending = BigInt(0);
      for (const tokenId of uniqueTokenIds) {
        try {
          const yieldAmount = await calculateYield(BigInt(tokenId));
          // Ensure we're working with bigint
          const yieldBigInt = typeof yieldAmount === 'bigint' ? yieldAmount : BigInt(yieldAmount?.toString() || '0');
          totalPending += yieldBigInt;
        } catch (error) {
          console.error(`Failed to calculate yield for property ${tokenId}:`, error);
          // If calculation fails, yield is 0 for that property
        }
      }
      setTotalPendingYield(totalPending);

      // Calculate total earned
      const totalEarned = mappedProperties.reduce((sum, p) => sum + p.totalYieldEarned, BigInt(0));
      setTotalYieldEarned(totalEarned);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);
  
  // Load token balance function
  const loadTokenBalance = useCallback(async () => {
    if (!address) {
      setTokenBalanceValue(BigInt(0));
      return;
    }
    
    try {
      const balance = await readContract(wagmiConfig, {
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
      });
      setTokenBalanceValue(BigInt(balance.toString()));
    } catch (error) {
      console.error('Failed to load token balance:', error);
      setTokenBalanceValue(BigInt(0));
    }
  }, [address]);

  // Mint property transaction
  const { writeContract: writeMint, data: mintHash, isPending: isMintPending } = useWriteContract();
  
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
            // Get all existing properties to find occupied positions
            const existingProps = await api.get(`/properties/owner/${address}`).catch(() => []);
            const occupiedPositions = new Set(
              existingProps.map((p: any) => `${p.x ?? -1},${p.y ?? -1}`)
            );
            
            // Find first available position (left to right, top to bottom)
            let foundPosition = false;
            for (let y = 0; y < 15 && !foundPosition; y++) {
              for (let x = 0; x < 20 && !foundPosition; x++) {
                const posKey = `${x},${y}`;
                if (!occupiedPositions.has(posKey)) {
                  // Save coordinates to backend
                  await api.put(`/properties/${latestTokenId}/coordinates`, {
                    x,
                    y,
                  });
                  console.log(`Auto-placed property ${latestTokenId} at (${x}, ${y})`);
                  foundPosition = true;
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to assign coordinates:', error);
        }
        
        // Refresh balance
        await loadTokenBalance();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadTokenBalance();
        
        // Reload properties again to show the new position
        await loadProperties();
      };
      
      refreshData();
      setIsMinting(false);
    }
  }, [isMintSuccess, address, loadProperties, loadTokenBalance]);

  // Reload properties when claim succeeds
  useEffect(() => {
    if (isClaimSuccess) {
      loadProperties();
      loadTokenBalance();
      setIsClaiming(false);
    }
  }, [isClaimSuccess, loadProperties, loadTokenBalance]);
  
  // Load token balance on mount and when address changes
  useEffect(() => {
    loadTokenBalance();
  }, [loadTokenBalance]);

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
    });

    // Listen for property created events
    socket.on('property:created', (data: { propertyId: string; owner: string; propertyType: string }) => {
      if (data.owner.toLowerCase() === address?.toLowerCase()) {
        console.log('📦 New property created, refreshing...');
        loadProperties();
        loadTokenBalance();
      }
    });

    // Listen for yield claimed events
    socket.on('yield:claimed', (data: { propertyId: string; owner: string; amount: string }) => {
      if (data.owner.toLowerCase() === address?.toLowerCase()) {
        console.log('💰 Yield claimed, refreshing...');
        loadProperties();
        loadTokenBalance();
      }
    });

    // Listen for portfolio updates
    socket.on('portfolio:updated', () => {
      console.log('📊 Portfolio updated, refreshing...');
      loadProperties();
      loadTokenBalance();
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, [address, isConnected, loadProperties, loadTokenBalance]);

  // No periodic refresh - only refresh on:
  // 1. User actions (mint, claim)
  // 2. WebSocket events (real-time updates)
  // This prevents constant loading and improves UX

  // Load other players' properties for multiplayer view
  const loadOtherPlayersProperties = useCallback(async () => {
    if (!address) return;
    try {
      const allProperties = await api.get('/properties');
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
            <Button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
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
              totalPendingYield={totalPendingYield}
              totalYieldEarned={totalYieldEarned}
              isClaiming={isClaiming || isClaimPending || isClaimConfirming}
              onClaimAll={async () => {
                if (!address || properties.length === 0) return;
                try {
                  setIsClaiming(true);
                  const propertyIds = properties.map(p => BigInt(p.tokenId));
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
                    await writeMint({
                      address: CONTRACTS.PropertyNFT,
                      abi: PROPERTY_NFT_ABI,
                      functionName: 'mintProperty',
                      args: [address, propertyTypes[type], propertyCosts[type], yieldRates[type]],
                    });
                    setShowBuildMenu(false);
                  } catch (error) {
                    console.error('Failed to mint property:', error);
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
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
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
            )}
          </div>
        </div>
      </main>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetails
          property={selectedProperty}
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isClaiming={isClaiming || isClaimPending || isClaimConfirming}
          onClaimYield={async () => {
            if (!selectedProperty) return;
            try {
              setIsClaiming(true);
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
            // TODO: Implement RWA linking
            console.log('Link to RWA');
          }}
          onSellProperty={() => {
            setPropertyToSell(selectedProperty);
            setShowSellProperty(true);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* Global Chat */}
      <GlobalChat isOpen={showChat} onClose={() => setShowChat(false)} />
      
      {/* Game Guide */}
      <GameGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Leaderboard</h2>
              <Button onClick={() => setShowLeaderboard(false)} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <Leaderboard />
            </div>
          </div>
        </div>
      )}

      {/* Guilds Modal */}
      {showGuilds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Guilds</h2>
              <Button onClick={() => setShowGuilds(false)} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <Guilds />
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Modal */}
      {showMarketplace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Marketplace</h2>
              <Button onClick={() => setShowMarketplace(false)} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <Marketplace />
            </div>
          </div>
        </div>
      )}

      {/* Quests Modal */}
      {showQuests && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Quests</h2>
              <Button onClick={() => setShowQuests(false)} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
            <div className="p-4">
              <Quests />
            </div>
          </div>
        </div>
      )}

      {/* Sell Property Modal */}
      {showSellProperty && propertyToSell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
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
