'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { CityView } from '@/components/game/CityView';
import { PropertyCard } from '@/components/game/PropertyCard';
import { BuildMenu } from '@/components/game/BuildMenu';
import { YieldDisplay } from '@/components/game/YieldDisplay';
import { PropertyDetails } from '@/components/game/PropertyDetails';
import { GlobalChat } from '@/components/GlobalChat';
import { WalletConnect } from '@/components/WalletConnect';
import { MessageSquare, Building2, TrendingUp, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getOwnerProperties, calculateYield, CONTRACTS, PropertyNFTABI } from '@/lib/contracts';
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
  const [tokenBalance, setTokenBalance] = useState(0n);
  const [totalPendingYield, setTotalPendingYield] = useState(0n);
  const [totalYieldEarned, setTotalYieldEarned] = useState(0n);
  const [isLoading, setIsLoading] = useState(true);

  // Load properties
  useEffect(() => {
    if (!address || !isConnected) return;

    const loadProperties = async () => {
      try {
        setIsLoading(true);
        
        // Get properties from backend
        const backendProperties = await api.get(`/properties/owner/${address}`);
        
        // Get token IDs from contract
        const tokenIds = await getOwnerProperties(address as `0x${string}`);
        
        // Map properties with positions
        const mappedProperties: Property[] = await Promise.all(
          tokenIds.map(async (tokenId, index) => {
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
        let totalPending = 0n;
        for (const tokenId of tokenIds) {
          const yieldAmount = await calculateYield(tokenId);
          totalPending += BigInt(yieldAmount.toString());
        }
        setTotalPendingYield(totalPending);

        // Calculate total earned
        const totalEarned = mappedProperties.reduce((sum, p) => sum + p.totalYieldEarned, 0n);
        setTotalYieldEarned(totalEarned);
      } catch (error) {
        console.error('Failed to load properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProperties();
  }, [address, isConnected]);

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
              onClaimAll={() => {
                // TODO: Implement claim all yield
                console.log('Claim all yield');
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
                tokenBalance={tokenBalance}
                onBuildProperty={(type) => {
                  // TODO: Implement property minting
                  console.log('Build property:', type);
                  setShowBuildMenu(false);
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
                properties={properties}
                onPropertyClick={(property) => setSelectedProperty(property)}
                onEmptyTileClick={(x, y) => {
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
                    onClaimYield={() => {
                      // TODO: Implement claim yield for specific property
                      console.log('Claim yield for property:', property.tokenId);
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
          onClaimYield={() => {
            // TODO: Implement claim yield
            console.log('Claim yield');
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

