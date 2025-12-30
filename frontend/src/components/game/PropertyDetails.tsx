'use client';

import { X, Building2, DollarSign, TrendingUp, Link as LinkIcon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PropertyDetailsProps {
  property: {
    id: string;
    tokenId: number;
    propertyType: 'Residential' | 'Commercial' | 'Industrial' | 'Luxury';
    value: bigint;
    yieldRate: number;
    totalYieldEarned: bigint;
    rwaContract?: string;
    rwaTokenId?: number;
  };
  claimableYield?: bigint; // Claimable yield for this property (from contract)
  isOpen: boolean;
  onClose: () => void;
  onClaimYield?: () => void | Promise<void>;
  onLinkRWA?: () => void;
  onSellProperty?: () => void;
  onCancelListing?: () => void;
  isListed?: boolean;
  isClaiming?: boolean;
}

export function PropertyDetails({
  property,
  claimableYield,
  isOpen,
  onClose,
  onClaimYield,
  onLinkRWA,
  onSellProperty,
  onCancelListing,
  isListed = false,
  isClaiming = false,
}: PropertyDetailsProps) {
  if (!isOpen) return null;

  const formatValue = (value: bigint) => {
    return (Number(value) / 1e18).toFixed(4);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md border-white/20 bg-gray-900/95 backdrop-blur-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{property.propertyType} Property</h2>
                  <p className="text-sm text-gray-400">Token ID: #{property.tokenId}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <CardContent className="space-y-4 p-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Property Value</p>
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
                <p className="text-2xl font-bold text-emerald-500">{formatValue(property.totalYieldEarned)} TYCOON</p>
              </div>

              {property.rwaContract ? (
                <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-semibold">✅ Linked to RWA - Using RWA Yield</p>
                  </div>
                  <p className="text-xs text-gray-300 mb-1">Yield calculated from RWA value and yield rate</p>
                  <p className="text-sm text-white font-mono truncate">{property.rwaContract}</p>
                  {property.rwaTokenId && (
                    <p className="text-xs text-gray-400">Token ID: {property.rwaTokenId}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Not linked to RWA</p>
                  {onLinkRWA && (
                    <Button onClick={onLinkRWA} variant="outline" size="sm" className="w-full">
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Link to RWA
                    </Button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
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
                  {isListed ? (
                    onCancelListing && (
                      <Button 
                        onClick={onCancelListing} 
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        Cancel Listing
                      </Button>
                    )
                  ) : (
                    onSellProperty && (
                      <Button 
                        onClick={onSellProperty} 
                        variant="outline"
                        className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        Sell Property
                      </Button>
                    )
                  )}
                </div>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Close
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </>
  );
}
