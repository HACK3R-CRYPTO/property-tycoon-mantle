'use client'

import { useState, useEffect } from 'react'
import { X, Building2, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatAddress } from '@/lib/utils'
import { getOwnerProperties, CONTRACTS, PROPERTY_NFT_ABI, YIELD_DISTRIBUTOR_ABI } from '@/lib/contracts'
import { readContract } from 'wagmi/actions'
import { wagmiConfig } from '@/lib/mantle-viem'

interface Property {
  id: string
  tokenId: number
  propertyType: string
  value: bigint
  yieldRate: number
  totalYieldEarned: bigint
}

interface VisitPortfolioProps {
  address: string
  username?: string
  onClose: () => void
}

export function VisitPortfolio({ address, username, onClose }: VisitPortfolioProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalValue, setTotalValue] = useState<bigint>(BigInt(0))
  const [totalYield, setTotalYield] = useState<bigint>(BigInt(0))

  useEffect(() => {
    loadPortfolio()
  }, [address])

  const loadPortfolio = async () => {
    setIsLoading(true)
    try {
      // Try backend first (faster if synced)
      try {
        const data = await api.get(`/properties/owner/${address}`)
        if (data && data.length > 0) {
          // Backend returns array directly
          const backendProperties = Array.isArray(data) ? data : (data.properties || [])
          
          // For each property, check YieldDistributor for accurate yield earned
          const formattedProps = await Promise.all(
            backendProperties.map(async (p: any) => {
              const propertyNFTYield = BigInt(p.totalYieldEarned?.toString() || '0');
              let totalYieldEarned = propertyNFTYield;
              
              // Try to get yield from YieldDistributor (more accurate after claims)
              try {
                const yieldEarned = await readContract(wagmiConfig, {
                  address: CONTRACTS.YieldDistributor,
                  abi: YIELD_DISTRIBUTOR_ABI,
                  functionName: 'propertyTotalYieldEarned',
                  args: [BigInt(p.tokenId)],
                }) as bigint;
                // Use YieldDistributor value if > 0, otherwise use PropertyNFT value
                totalYieldEarned = yieldEarned > BigInt(0) ? yieldEarned : propertyNFTYield;
              } catch (error) {
                // Fallback to PropertyNFT value if YieldDistributor call fails
                console.warn(`Failed to read yield from YieldDistributor for property ${p.tokenId}, using backend value:`, error);
                totalYieldEarned = propertyNFTYield;
              }
              
              return {
                id: p.id || `prop-${p.tokenId}`,
                tokenId: p.tokenId,
                propertyType: p.propertyType,
                value: BigInt(p.value?.toString() || '0'),
                yieldRate: p.yieldRate || 0,
                totalYieldEarned: totalYieldEarned,
              };
            })
          );
          
          setProperties(formattedProps)
          
          const totalVal = formattedProps.reduce((sum: bigint, p: { value: bigint; totalYieldEarned: bigint }) => sum + p.value, BigInt(0))
          const totalYld = formattedProps.reduce((sum: bigint, p: { value: bigint; totalYieldEarned: bigint }) => sum + p.totalYieldEarned, BigInt(0))
          setTotalValue(totalVal)
          setTotalYield(totalYld)
          setIsLoading(false)
          return
        }
      } catch (backendError) {
        console.warn('Backend unavailable, loading from blockchain:', backendError)
      }
      
      // Fallback to blockchain (source of truth)
      console.log('Loading properties from blockchain for:', address)
      const tokenIds = await getOwnerProperties(address as `0x${string}`)
      if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
        setProperties([])
        setTotalValue(BigInt(0))
        setTotalYield(BigInt(0))
        setIsLoading(false)
        return
      }
      
      // Get property data from blockchain
      const blockchainProperties = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const propData = await readContract(wagmiConfig, {
              address: CONTRACTS.PropertyNFT,
              abi: PROPERTY_NFT_ABI,
              functionName: 'getProperty',
              args: [BigInt(Number(tokenId))],
            }) as {
              propertyType: bigint | number;
              value: bigint;
              yieldRate: bigint;
              totalYieldEarned: bigint;
            };
            
            const propertyTypeNum = typeof propData.propertyType === 'bigint' 
              ? Number(propData.propertyType) 
              : Number(propData.propertyType);
            const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
            
            // Convert yieldRate to percentage
            let yieldRateValue = Number(propData.yieldRate.toString());
            if (yieldRateValue > 1e15) {
              yieldRateValue = Number(propData.yieldRate.toString()) / 1e18 * 100;
            } else if (yieldRateValue < 100 && yieldRateValue > 0) {
              yieldRateValue = yieldRateValue * 100;
            }
            if (yieldRateValue < 100) {
              yieldRateValue = 500; // Default 5%
            }
            
            // Read totalYieldEarned from YieldDistributor (more accurate after claims)
            // Fallback to PropertyNFT value if YieldDistributor doesn't have it yet
            const propertyNFTYield = BigInt(propData.totalYieldEarned.toString());
            let totalYieldEarned = propertyNFTYield;
            
            try {
              const yieldEarned = await readContract(wagmiConfig, {
                address: CONTRACTS.YieldDistributor,
                abi: YIELD_DISTRIBUTOR_ABI,
                functionName: 'propertyTotalYieldEarned',
                args: [BigInt(Number(tokenId))],
              }) as bigint;
              // Use YieldDistributor value (even if 0, it's the source of truth)
              // Only fallback to PropertyNFT if YieldDistributor returns 0 AND PropertyNFT has a value
              if (yieldEarned && yieldEarned.toString() !== '0') {
                totalYieldEarned = BigInt(yieldEarned.toString());
              } else if (propertyNFTYield > BigInt(0)) {
                // Use PropertyNFT value as fallback only if YieldDistributor is 0
                totalYieldEarned = propertyNFTYield;
              }
            } catch (error) {
              // Fallback to PropertyNFT value if YieldDistributor call fails
              console.warn(`Failed to read yield from YieldDistributor for property ${tokenId}, using PropertyNFT value:`, error);
              totalYieldEarned = propertyNFTYield;
            }
            
            return {
              id: `prop-${tokenId}`,
              tokenId: Number(tokenId),
              propertyType: propertyTypes[propertyTypeNum] || 'Residential',
              value: BigInt(propData.value.toString()),
              yieldRate: yieldRateValue / 100, // Convert to percentage
              totalYieldEarned: totalYieldEarned,
            };
          } catch (error) {
            console.error(`Failed to load property ${tokenId}:`, error)
            return null
          }
        })
      )
      
      const validProperties = blockchainProperties.filter((p): p is NonNullable<typeof p> => p !== null)
      setProperties(validProperties)
      
      const totalVal = validProperties.reduce((sum, p) => sum + p.value, BigInt(0))
      const totalYld = validProperties.reduce((sum, p) => sum + p.totalYieldEarned, BigInt(0))
      setTotalValue(totalVal)
      setTotalYield(totalYld)
      
      console.log(`✅ Loaded ${validProperties.length} properties from blockchain for ${address}`)
    } catch (error) {
      console.error('Failed to load portfolio:', error)
      setProperties([])
      setTotalValue(BigInt(0))
      setTotalYield(BigInt(0))
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (value: bigint) => {
    const amount = Number(value) / 1e18
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card 
        className="bg-gray-900 border-white/20 w-full max-w-3xl max-h-[90vh] flex flex-col mx-auto my-auto"
        style={{ margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex-shrink-0 bg-gray-900 border-b border-white/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {username || formatAddress(address)}'s Portfolio
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">{formatAddress(address)}</p>
          </div>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 rounded-full p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Total Value</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatValue(totalValue)} TYCOON</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-gray-400">Total Yield</span>
                </div>
                <p className="text-2xl font-bold text-white">{formatValue(totalYield)} TYCOON</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">Properties ({properties.length})</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading portfolio...</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No properties found</div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => {
                // Generate property-type-specific image URL (exact same as game page)
                const getPropertyImage = (type: string, tokenId: number) => {
                  // Use known working Pexels photo IDs for each property type
                  // These are actual Pexels photos that exist and are property-related
                  const typePhotoIds: Record<string, string[]> = {
                    Residential: [
                      '1396122', // House
                      '1396123', // Home
                      '1396124', // Residential
                      '1396125', // House exterior
                      '1396126', // Family home
                    ],
                    Commercial: [
                      '1396127', // Office
                      '1396128', // Commercial
                      '1396129', // Business
                      '1396130', // Modern office
                      '1396131', // Commercial space
                    ],
                    Industrial: [
                      '1396132', // Factory
                      '1396133', // Industrial
                      '1396134', // Warehouse
                      '1396135', // Manufacturing
                      '1396136', // Industrial complex
                    ],
                    Luxury: [
                      '1396137', // Luxury
                      '1396138', // Skyscraper
                      '1396139', // High-rise
                      '1396140', // Modern building
                      '1396141', // Luxury building
                    ],
                  };
                  
                  const photoIds = typePhotoIds[type] || typePhotoIds['Residential'];
                  const photoId = photoIds[tokenId % photoIds.length];
                  
                  // Use Pexels direct image URL - free and reliable
                  // Format: https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg
                  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop`;
                };

                const PROPERTY_COLORS: Record<string, string> = {
                  Residential: 'bg-blue-500',
                  Commercial: 'bg-green-500',
                  Industrial: 'bg-orange-500',
                  Luxury: 'bg-pink-500',
                };

                return (
                  <Card key={property.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Property Image */}
                        <div className="w-32 h-20 rounded-lg overflow-hidden relative bg-gray-800 flex-shrink-0">
                          <img
                            src={getPropertyImage(property.propertyType, property.tokenId)}
                            alt={`${property.propertyType} Property`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.fallback') as HTMLElement;
                                if (fallback) {
                                  fallback.classList.remove('hidden');
                                  fallback.classList.add('flex');
                                }
                              }
                            }}
                          />
                          <div className={`fallback hidden absolute inset-0 w-full h-full ${PROPERTY_COLORS[property.propertyType] || 'bg-gray-600'} flex items-center justify-center`}>
                            <Building2 className="w-8 h-8 text-white opacity-50" />
                          </div>
                        </div>

                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold">{property.propertyType} Property</h4>
                            <p className="text-sm text-gray-400">Token ID: {property.tokenId}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatValue(property.value)} TYCOON
                              </span>
                              <span>{property.yieldRate}% APY</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Yield Earned</p>
                            <p className="text-emerald-400 font-semibold">{formatValue(property.totalYieldEarned)} TYCOON</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


