'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Tag, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS, MARKETPLACE_ABI } from '@/lib/contracts';

interface Listing {
  id: string;
  propertyId: string;
  property: {
    tokenId: number;
    propertyType: string;
    value: bigint;
    yieldRate: number;
  };
  seller: {
    walletAddress: string;
    username?: string;
  };
  price: bigint;
  listingType: 'fixed' | 'auction';
  auctionEndTime?: Date;
  highestBid?: bigint;
  isActive: boolean;
}

export function Marketplace() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const { writeContract: writePurchase, data: purchaseHash, isPending: isPurchasePending } = useWriteContract();
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    if (isPurchaseSuccess) {
      setPurchasingId(null);
      loadListings();
    }
  }, [isPurchaseSuccess]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/marketplace/listings');
      setListings(data.filter((l: Listing) => l.isActive));
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseProperty = async (listing: Listing) => {
    if (!address || !isConnected) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setPurchasingId(listing.id);
      writePurchase({
        address: CONTRACTS.Marketplace,
        abi: MARKETPLACE_ABI,
        functionName: 'buyProperty',
        args: [BigInt(listing.property.tokenId)],
        value: listing.price,
      });
    } catch (error: any) {
      console.error('Failed to purchase:', error);
      alert(error.message || 'Failed to purchase property');
      setPurchasingId(null);
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
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Marketplace
        </CardTitle>
        <p className="text-sm text-gray-400">Buy properties from other players</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading marketplace...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No properties for sale</p>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">
                        {listing.property.propertyType} Property #{listing.property.tokenId}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                        {listing.listingType === 'auction' ? 'Auction' : 'Fixed Price'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Seller: {listing.seller.username || `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Value: {formatValue(listing.property.value)} TYCOON</span>
                      <span>Yield: {listing.property.yieldRate / 100}% APY</span>
                      {listing.listingType === 'auction' && listing.auctionEndTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ends: {new Date(listing.auctionEndTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-emerald-400 font-semibold text-lg mb-2">
                      {formatValue(listing.price)} TYCOON
                    </p>
                    {listing.listingType === 'auction' && listing.highestBid && (
                      <p className="text-xs text-gray-400 mb-2">
                        Highest bid: {formatValue(listing.highestBid)} TYCOON
                      </p>
                    )}
                    <Button
                      onClick={() => purchaseProperty(listing)}
                      disabled={!isConnected || purchasingId === listing.id || isPurchasePending || isPurchaseConfirming}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      {purchasingId === listing.id
                        ? isPurchaseConfirming
                          ? 'Confirming...'
                          : 'Purchasing...'
                        : 'Buy Now'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

