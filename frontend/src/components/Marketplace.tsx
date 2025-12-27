'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Tag, Clock, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACTS, MARKETPLACE_ABI, PROPERTY_NFT_ABI } from '@/lib/contracts';

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

interface MarketplaceProps {
  preselectedProperty?: {
    tokenId: number;
    propertyType: string;
    value: bigint;
  };
  onListed?: () => void;
}

export function Marketplace({ preselectedProperty, onListed }: MarketplaceProps = {} as MarketplaceProps) {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [showListProperty, setShowListProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listingType, setListingType] = useState<'fixed' | 'auction'>('fixed');
  const [auctionDuration, setAuctionDuration] = useState('7'); // days

  const { writeContract: writePurchase, data: purchaseHash, isPending: isPurchasePending } = useWriteContract();
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchaseSuccess } = useWaitForTransactionReceipt({
    hash: purchaseHash,
  });

  const { writeContract: writeList, data: listHash, isPending: isListPending } = useWriteContract();
  const { isLoading: isListConfirming, isSuccess: isListSuccess } = useWaitForTransactionReceipt({
    hash: listHash,
  });

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { writeContract: writeCancel, data: cancelHash, isPending: isCancelPending } = useWriteContract();
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({
    hash: cancelHash,
  });

  const [needsApproval, setNeedsApproval] = useState(false);

  useEffect(() => {
    loadListings();
    if (address) {
      loadMyProperties();
    }
    if (preselectedProperty) {
      setShowListProperty(true);
      setSelectedProperty(preselectedProperty);
      setNeedsApproval(false); // Start fresh
    }
  }, [address, preselectedProperty]);

  // Reload properties when modal opens
  useEffect(() => {
    if (showListProperty && address) {
      loadMyProperties();
    }
  }, [showListProperty, address]);

  useEffect(() => {
    if (isPurchaseSuccess || isListSuccess || isCancelSuccess) {
      setPurchasingId(null);
      setShowListProperty(false);
      setSelectedProperty(null);
      setListingPrice('');
      loadListings();
      if (address) {
        loadMyProperties();
      }
      if (isListSuccess && onListed) {
        onListed();
      }
    }
  }, [isPurchaseSuccess, isListSuccess, isCancelSuccess, address, onListed]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/marketplace/listings');
      const activeListings = data.filter((l: Listing) => l.isActive);
      setListings(activeListings.filter((l: Listing) => 
        l.seller.walletAddress?.toLowerCase() !== address?.toLowerCase()
      ));
      setMyListings(activeListings.filter((l: Listing) => 
        l.seller.walletAddress?.toLowerCase() === address?.toLowerCase()
      ));
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyProperties = async () => {
    if (!address) {
      setMyProperties([]);
      return;
    }
    try {
      const properties = await api.get(`/properties/owner/${address}`);
      console.log('Loaded properties for listing:', properties);
      // Ensure properties is an array
      if (Array.isArray(properties)) {
        setMyProperties(properties);
      } else {
        console.warn('Properties API returned non-array:', properties);
        setMyProperties([]);
      }
    } catch (error) {
      console.error('Failed to load my properties:', error);
      setMyProperties([]);
    }
  };

  const approveProperty = async () => {
    if (!address || !isConnected || !selectedProperty) return;
    
    try {
      writeApprove({
        address: CONTRACTS.PropertyNFT,
        abi: PROPERTY_NFT_ABI,
        functionName: 'approve',
        args: [CONTRACTS.Marketplace, BigInt(selectedProperty.tokenId)],
      });
    } catch (error: any) {
      console.error('Failed to approve property:', error);
      alert(error.message || 'Failed to approve property');
    }
  };

  const listProperty = async () => {
    if (!address || !isConnected || !selectedProperty || !listingPrice) {
      alert('Please fill in all fields');
      return;
    }

    // Check if approval is needed first
    if (needsApproval) {
      await approveProperty();
      return;
    }

    try {
      const priceInWei = parseEther(listingPrice);
      
      if (listingType === 'fixed') {
        writeList({
          address: CONTRACTS.Marketplace,
          abi: MARKETPLACE_ABI,
          functionName: 'listProperty',
          args: [BigInt(selectedProperty.tokenId), priceInWei],
        });
      } else {
        const durationInSeconds = BigInt(Number(auctionDuration) * 24 * 60 * 60);
        writeList({
          address: CONTRACTS.Marketplace,
          abi: MARKETPLACE_ABI,
          functionName: 'createAuction',
          args: [BigInt(selectedProperty.tokenId), priceInWei, durationInSeconds],
        });
      }
    } catch (error: any) {
      console.error('Failed to list property:', error);
      // If error mentions approval, set needsApproval flag
      if (error.message?.toLowerCase().includes('approval') || error.message?.toLowerCase().includes('transfer')) {
        setNeedsApproval(true);
        alert('Please approve the marketplace first, then try listing again.');
      } else {
        alert(error.message || 'Failed to list property');
      }
    }
  };

  // When approval succeeds, automatically proceed with listing
  useEffect(() => {
    if (isApproveSuccess && selectedProperty && listingPrice && needsApproval) {
      setNeedsApproval(false);
      // Small delay to ensure approval is processed
      setTimeout(() => {
        const priceInWei = parseEther(listingPrice);
        
        if (listingType === 'fixed') {
          writeList({
            address: CONTRACTS.Marketplace,
            abi: MARKETPLACE_ABI,
            functionName: 'listProperty',
            args: [BigInt(selectedProperty.tokenId), priceInWei],
          });
        } else {
          const durationInSeconds = BigInt(Number(auctionDuration) * 24 * 60 * 60);
          writeList({
            address: CONTRACTS.Marketplace,
            abi: MARKETPLACE_ABI,
            functionName: 'createAuction',
            args: [BigInt(selectedProperty.tokenId), priceInWei, durationInSeconds],
          });
        }
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess, selectedProperty, listingPrice, listingType, auctionDuration, needsApproval]);

  const cancelListing = async (propertyId: number) => {
    if (!address || !isConnected) return;
    
    try {
      writeCancel({
        address: CONTRACTS.Marketplace,
        abi: MARKETPLACE_ABI,
        functionName: 'cancelListing',
        args: [BigInt(propertyId)],
      });
    } catch (error: any) {
      console.error('Failed to cancel listing:', error);
      alert(error.message || 'Failed to cancel listing');
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
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Marketplace
              </CardTitle>
              <p className="text-sm text-gray-400">Buy and sell properties</p>
            </div>
            {isConnected && (
              <Button
                onClick={() => setShowListProperty(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                List Property
              </Button>
            )}
          </div>
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

      {/* My Listings */}
      {isConnected && myListings.length > 0 && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="w-5 h-5" />
              My Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">
                          {listing.property.propertyType} Property #{listing.property.tokenId}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                          {listing.listingType === 'auction' ? 'Auction' : 'Fixed Price'}
                        </span>
                      </div>
                      <p className="text-emerald-400 font-semibold text-lg">
                        {formatValue(listing.price)} TYCOON
                      </p>
                    </div>
                    <Button
                      onClick={() => cancelListing(listing.property.tokenId)}
                      disabled={isCancelPending || isCancelConfirming}
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List Property Modal */}
      {showListProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-white/20 bg-gray-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">List Property for Sale</CardTitle>
                <Button onClick={() => setShowListProperty(false)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Select Property</label>
                {preselectedProperty ? (
                  <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <p className="text-white font-semibold">
                      {preselectedProperty.propertyType} Property #{preselectedProperty.tokenId}
                    </p>
                    <p className="text-xs text-gray-400">Value: {formatValue(preselectedProperty.value)} TYCOON</p>
                  </div>
                ) : (
                  <>
                    {myProperties.length === 0 ? (
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-400">Loading your properties...</p>
                        {address && (
                          <p className="text-xs text-gray-500 mt-1">
                            If no properties appear, make sure you own properties and they're synced.
                          </p>
                        )}
                      </div>
                    ) : (
                      <select
                        value={selectedProperty?.tokenId || ''}
                        onChange={(e) => {
                          const prop = myProperties.find((p: any) => p.tokenId === Number(e.target.value));
                          setSelectedProperty(prop);
                          setNeedsApproval(false); // Reset approval flag when property changes
                        }}
                        className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white"
                      >
                        <option value="">Choose a property...</option>
                        {myProperties
                          .filter((p: any) => {
                            // Filter out properties that are already listed
                            const isListed = myListings.some((l: Listing) => {
                              const listingTokenId = l.property?.tokenId || l.propertyId;
                              return listingTokenId === p.tokenId;
                            });
                            return !isListed;
                          })
                          .map((prop: any) => {
                            const tokenId = prop.tokenId || prop.token_id;
                            const propertyType = prop.propertyType || prop.property_type || 'Unknown';
                            const value = prop.value || prop.value || '0';
                            return (
                              <option key={tokenId} value={tokenId}>
                                {propertyType} #{tokenId} - {formatValue(BigInt(value?.toString() || '0'))} TYCOON
                              </option>
                            );
                          })}
                      </select>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Listing Type</label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setListingType('fixed')}
                    variant={listingType === 'fixed' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Fixed Price
                  </Button>
                  <Button
                    onClick={() => setListingType('auction')}
                    variant={listingType === 'auction' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Auction
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  {listingType === 'fixed' ? 'Price' : 'Starting Price'} (TYCOON)
                </label>
                <Input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="Enter price"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {listingType === 'auction' && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Duration (days)</label>
                  <Input
                    type="number"
                    value={auctionDuration}
                    onChange={(e) => setAuctionDuration(e.target.value)}
                    placeholder="7"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {needsApproval ? (
                  <Button
                    onClick={approveProperty}
                    disabled={isApprovePending || isApproveConfirming}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve Marketplace First'}
                  </Button>
                ) : (
                  <Button
                    onClick={listProperty}
                    disabled={!selectedProperty || !listingPrice || isListPending || isListConfirming || isApprovePending || isApproveConfirming}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isListPending || isListConfirming ? 'Listing...' : 'List Property'}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowListProperty(false);
                    setSelectedProperty(null);
                    setListingPrice('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

