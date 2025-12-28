'use client';

import { TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface YieldDisplayProps {
  totalPendingYield: bigint; // Real-time estimated yield (accumulating by seconds)
  totalYieldEarned: bigint;
  claimableYield?: bigint; // On-chain claimable yield (requires 24 hours)
  onClaimAll?: () => void | Promise<void>;
  isClaiming?: boolean;
}

export function YieldDisplay({ totalPendingYield, totalYieldEarned, claimableYield, onClaimAll, isClaiming = false }: YieldDisplayProps) {
  const formatValue = (value: bigint) => {
    // Convert from wei to TYCOON (divide by 1e18)
    // Always use BigInt division for accuracy
    const divisor = BigInt('1000000000000000000'); // 1e18
    const quotient = value / divisor;
    const remainder = value % divisor;
    
    // Calculate decimal part accurately
    const decimalPart = Number(remainder) / Number(divisor);
    const tycoonAmount = Number(quotient) + decimalPart;
    
    // Debug logging (remove in production)
    if (tycoonAmount > 1000) {
      console.warn('⚠️ formatValue: Large value detected:', {
        originalWei: value.toString(),
        quotient: quotient.toString(),
        remainder: remainder.toString(),
        decimalPart,
        tycoonAmount,
      });
    }
    
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
        {/* Claimable Yield - PRIMARY DISPLAY (24-hour requirement - core game mechanic) */}
        <div>
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Claimable Yield
          </p>
          <p className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            {claimableYield !== undefined ? formatValue(claimableYield) : formatValue(totalPendingYield)} TYCOON
          </p>
          {claimableYield !== undefined && claimableYield === BigInt(0) && totalPendingYield > BigInt(0) ? (
            <p className="text-xs text-yellow-400 mt-1">
              Properties generate yield daily • Requires 24 hours before claiming
              {typeof window !== 'undefined' && (window as any).propertyTimeRemaining ? (
                <span className="block mt-1">
                  {(() => {
                    const timeRemainingMap = (window as any).propertyTimeRemaining as Map<number, { hours: number; minutes: number; isClaimable: boolean }>;
                    // Find the property with the SHORTEST time remaining (closest to being claimable)
                    const nonClaimableProperties = Array.from(timeRemainingMap.values()).filter((t) => !t.isClaimable);
                    if (nonClaimableProperties.length > 0) {
                      // Sort by total minutes remaining (hours * 60 + minutes) and get the minimum
                      const shortestTime = nonClaimableProperties.reduce((min, current) => {
                        const minMinutes = min.hours * 60 + min.minutes;
                        const currentMinutes = current.hours * 60 + current.minutes;
                        return currentMinutes < minMinutes ? current : min;
                      });
                      return `⏱️ ${shortestTime.hours}h ${shortestTime.minutes}m remaining`;
                    }
                    return '';
                  })()}
                </span>
              ) : null}
            </p>
          ) : claimableYield !== undefined && claimableYield > BigInt(0) ? (
            <p className="text-xs text-green-400 mt-1">
              Ready to claim! Your daily yield is available
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Properties generate yield daily • Check back tomorrow
            </p>
          )}
        </div>

        {/* Estimated Yield - SECONDARY DISPLAY (for engagement, shows what's accumulating) */}
        {totalPendingYield > BigInt(0) && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Estimated Yield (Accumulating)
            </p>
            <p className="text-xl font-semibold text-white">
              {formatValue(totalPendingYield)} TYCOON
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Growing in real-time • Will be claimable after 24 hours
            </p>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-400 mb-1">Total Earned (All Time)</p>
          <p className="text-xl font-semibold text-white">{formatValue(totalYieldEarned)} TYCOON</p>
        </div>

        {onClaimAll && claimableYield !== undefined && claimableYield > 0n && (
          <Button 
            onClick={onClaimAll} 
            disabled={isClaiming}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {isClaiming ? 'Claiming...' : 'Claim Daily Yield'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
