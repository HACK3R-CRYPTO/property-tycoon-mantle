'use client';

import { Building2, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PropertyCardProps {
  property: {
    id: string;
    tokenId: number;
    propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
    value: bigint;
    yieldRate: number;
    totalYieldEarned: bigint;
  };
  claimableYield?: bigint; // Claimable yield for this specific property (from contract)
  onClaimYield?: () => void | Promise<void>;
  onViewDetails?: () => void;
  isClaiming?: boolean;
}

const PROPERTY_COLORS = {
  Residential: 'bg-blue-500',
  Commercial: 'bg-green-500',
  Industrial: 'bg-orange-500',
  Luxury: 'bg-pink-500',
};

export function PropertyCard({ property, claimableYield, onClaimYield, onViewDetails, isClaiming = false }: PropertyCardProps) {
  const formatValue = (value: bigint) => {
    return (Number(value) / 1e18).toFixed(2);
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg ${PROPERTY_COLORS[property.propertyType]} flex items-center justify-center`}>
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">{property.propertyType}</CardTitle>
            <p className="text-sm text-gray-400">Token ID: #{property.tokenId}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Value</p>
            <p className="text-lg font-semibold text-white flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {formatValue(property.value)} TYCOON
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Yield Rate</p>
            <p className="text-lg font-semibold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {(property.yieldRate / 100).toFixed(1)}% APY
            </p>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-gray-400 mb-1">Total Yield Earned</p>
          <p className="text-xl font-bold text-emerald-500">{formatValue(property.totalYieldEarned)} TYCOON</p>
        </div>

        <div className="flex gap-2">
          {onClaimYield && (
            <Button 
              onClick={onClaimYield} 
              disabled={isClaiming || !claimableYield || claimableYield === BigInt(0)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!claimableYield || claimableYield === BigInt(0) ? 'No yield available yet. Requires 24 hours after property creation.' : 'Claim your yield'}
            >
              {isClaiming ? 'Claiming...' : claimableYield && claimableYield > BigInt(0) ? 'Claim Yield' : 'No Yield Yet'}
            </Button>
          )}
          {onViewDetails && (
            <Button onClick={onViewDetails} variant="outline" className="flex-1">
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
