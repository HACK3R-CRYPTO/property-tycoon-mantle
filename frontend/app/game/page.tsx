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
import { MessageSquare, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOwnerProperties, calculateYield, CONTRACTS, PROPERTY_NFT_ABI, YIELD_DISTRIBUTOR_ABI } from '@/lib/contracts';
import { readContract } from 'wagmi/actions';
import { wagmiConfig } from '@/lib/mantle-viem';

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
  const [totalPendingYield, setTotalPendingYield] = useState<bigint>(BigInt(0));
  const [totalYieldEarned, setTotalYieldEarned] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tokenBalanceValue, setTokenBalanceValue] = useState<bigint>(BigInt(0));

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
      
      // Map properties with positions
      const mappedProperties: Property[] = await Promise.all(
        tokenIds.map(async (tokenId: bigint, index: number) => {
          const propData = await readContract(wagmiConfig, {
            address: CONTRACTS.PropertyNFT,
            abi: PROPERTY_NFT_ABI,
            functionName: 'getProperty',
            args: [tokenId],
          });

          return {
            id: `prop-${tokenId}`,
            tokenId: Number(tokenId),
            propertyType: ['Residential', 'Commercial', 'Industrial', 'Luxury'][Number(propData.propertyType)] as Property['propertyType'],
            value: BigInt(propData.value.toString()),
            yieldRate: Number(propData.yieldRate),
            totalYieldEarned: BigInt(propData.totalYieldEarned.toString()),
            x: index % 10,
            y: Math.floor(index / 10),
            rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' ? propData.rwaContract : undefined,
            rwaTokenId: propData.rwaTokenId ? Number(propData.rwaTokenId) : undefined,
          };
        })
      );

      setProperties(mappedProperties);

      // Calculate total pending yield
      let totalPending = BigInt(0);
      for (const tokenId of tokenIds) {
        try {
          const yieldAmount = await calculateYield(tokenId) as bigint;
          totalPending += BigInt(yieldAmount.toString());
        } catch (error) {
          console.error(`Failed to calculate yield for property ${tokenId}:`, error);
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

  // Reload properties when mint succeeds
  useEffect(() => {
    if (isMintSuccess) {
      loadProperties();
      loadTokenBalance();
      setIsMinting(false);
    }
  }, [isMintSuccess, loadProperties, loadTokenBalance]);

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

  // Load properties on mount and when address changes
  useEffect(() => {
    if (address && isConnected) {
      loadProperties();
    }
  }, [address, isConnected, loadProperties]);

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
                    Residential: parseEther('0.05'), // 5% APY
                    Commercial: parseEther('0.08'), // 8% APY
                    Industrial: parseEther('0.12'), // 12% APY
                    Luxury: parseEther('0.15'), // 15% APY
                  };

                  try {
                    setIsMinting(true);
                    writeMint({
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
                onPropertyClick={(property) => {
                  const fullProperty = properties.find(p => p.id === property.id);
                  if (fullProperty) setSelectedProperty(fullProperty);
                }}
                onEmptyTileClick={(x: number, y: number) => {
                  if (showBuildMenu) {
                    // TODO: Place property at x, y
                    console.log('Place property at:', x, y);
                  }
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
        />
      )}

      {/* Global Chat */}
      <GlobalChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
