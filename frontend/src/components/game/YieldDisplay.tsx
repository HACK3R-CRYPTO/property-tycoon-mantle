'use client';

import { TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface YieldDisplayProps {
  totalPendingYield: bigint;
  totalYieldEarned: bigint;
  onClaimAll?: () => void | Promise<void>;
  isClaiming?: boolean;
}

export function YieldDisplay({ totalPendingYield, totalYieldEarned, onClaimAll, isClaiming = false }: YieldDisplayProps) {
  const formatValue = (value: bigint) => {
    // Convert from wei to TYCOON (divide by 1e18)
    const tycoonAmount = Number(value) / 1e18;
    
    // Format with appropriate decimal places
    if (tycoonAmount < 0.0001) {
      return '0.0000';
    }
    if (tycoonAmount < 1) {
      return tycoonAmount.toFixed(4);
    }
    if (tycoonAmount < 1000) {
      return tycoonAmount.toFixed(2);
    }
    // For large amounts, use comma separators
    return tycoonAmount.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  // Calculate daily yield rate for display
  const dailyYield = Number(totalPendingYield) / 1e18;
  const dailyRate = dailyYield > 0 ? (dailyYield / 365).toFixed(4) : '0.0000';

  return (
    <Card className="border-white/10 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Yield Earnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending Yield
          </p>
          <p className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            {formatValue(totalPendingYield)} TYCOON
          </p>
          {totalPendingYield === BigInt(0) ? (
            <p className="text-xs text-gray-500 mt-1">
              Yield accumulates daily. Check back tomorrow!
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              ~{dailyRate} TYCOON/day
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Total Earned</p>
          <p className="text-xl font-semibold text-white">{formatValue(totalYieldEarned)} TYCOON</p>
        </div>

        {onClaimAll && totalPendingYield > 0n && (
          <Button 
            onClick={onClaimAll} 
            disabled={isClaiming}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {isClaiming ? 'Claiming...' : 'Claim All Yield'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

