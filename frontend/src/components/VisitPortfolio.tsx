'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/game/PropertyCard';
import { api } from '@/lib/api';

interface Property {
  id: string;
  tokenId: number;
  propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
  value: bigint;
  yieldRate: number;
  totalYieldEarned: bigint;
  x: number;
  y: number;
}

interface VisitPortfolioProps {
  walletAddress: string;
  username?: string;
  onClose: () => void;
}

export function VisitPortfolio({ walletAddress, username, onClose }: VisitPortfolioProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState<{
    totalPortfolioValue: bigint;
    totalYieldEarned: bigint;
    propertiesOwned: number;
  } | null>(null);

  useEffect(() => {
    loadPortfolio();
  }, [walletAddress]);

  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const userProperties = await api.get(`/properties/owner/${walletAddress}`);
      
      const mappedProperties = await Promise.all(
        userProperties.map(async (p: any) => {
          return {
            id: `prop-${p.tokenId}`,
            tokenId: Number(p.tokenId),
            propertyType: p.propertyType as Property['propertyType'],
            value: BigInt(p.value?.toString() || '0'),
            yieldRate: Number(p.yieldRate || 0),
            totalYieldEarned: BigInt(p.totalYieldEarned?.toString() || '0'),
            x: p.x || 0,
            y: p.y || 0,
          };
        })
      );

      setProperties(mappedProperties);

      // Calculate stats
      const totalPortfolioValue = mappedProperties.reduce(
        (sum, p) => sum + p.value,
        BigInt(0)
      );
      const totalYieldEarned = mappedProperties.reduce(
        (sum, p) => sum + p.totalYieldEarned,
        BigInt(0)
      );

      setUserStats({
        totalPortfolioValue,
        totalYieldEarned,
        propertiesOwned: mappedProperties.length,
      });
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: bigint) => {
    const tycoonAmount = Number(value) / 1e18;
    if (tycoonAmount < 1) {
      return tycoonAmount.toFixed(2);
    }
    return tycoonAmount.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-white/20 bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                {username || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}'s Portfolio
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">{walletAddress}</p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading portfolio...</div>
          ) : (
            <>
              {userStats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Portfolio Value</p>
                    <p className="text-xl font-semibold text-emerald-400">
                      {formatValue(userStats.totalPortfolioValue)} TYCOON
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Total Yield</p>
                    <p className="text-xl font-semibold text-blue-400">
                      {formatValue(userStats.totalYieldEarned)} TYCOON
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Properties</p>
                    <p className="text-xl font-semibold text-white">
                      {userStats.propertiesOwned}
                    </p>
                  </div>
                </div>
              )}

              {properties.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No properties found</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Properties ({properties.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {properties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onViewDetails={() => {}}
                        isClaiming={false}
                        onClaimYield={async () => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

