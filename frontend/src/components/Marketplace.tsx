'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Tag, Clock, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { readContract } from 'wagmi/actions';
import { io, Socket } from 'socket.io-client';
import { wagmiConfig } from '@/lib/mantle-viem';
import { CONTRACTS, MARKETPLACE_ABI, PROPERTY_NFT_ABI, PROPERTY_NFT_ABI as PropertyNFTABI } from '@/lib/contracts';
import { getOwnerProperties } from '@/lib/contracts';

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
  const [loadingSource, setLoadingSource] = useState<'backend' | 'blockchain'>('backend');
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
  const { data: isApprovedForAll, refetch: refetchApproval } = useReadContract({
    address: CONTRACTS.PropertyNFT,
    abi: PROPERTY_NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address && CONTRACTS.Marketplace ? [address, CONTRACTS.Marketplace] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.Marketplace,
    },
  });

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

  // Listen for real-time marketplace updates via WebSocket
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Auto-detect production and use Railway backend if env var not set
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('railway.app'));
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
      : (isProduction ? 'https://property-tycoon-mantle-production.up.railway.app' : 'http://localhost:3001');

    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('✅ Marketplace WebSocket connected');
    });

    const handleListing = (data: { propertyId: number; seller: string; price: string }) => {
      console.log('📢 New marketplace listing received via WebSocket:', data);
      // Reload listings to show new one
      loadListings();
    };

    const handleCancelled = (data: { propertyId: number; seller: string }) => {
      console.log('📢 Listing cancelled via WebSocket:', data);
      // Reload listings to remove cancelled one
      loadListings();
    };

    const handleTrade = (data: { listingId: number; seller: string; buyer: string; price: string }) => {
      console.log('📢 Marketplace trade via WebSocket:', data);
      // Reload listings to remove sold one
      loadListings();
    };

    socket.on('marketplace:listing', handleListing);
    socket.on('marketplace:cancelled', handleCancelled);
    socket.on('marketplace:trade', handleTrade);

    return () => {
      socket.off('marketplace:listing', handleListing);
      socket.off('marketplace:cancelled', handleCancelled);
      socket.off('marketplace:trade', handleTrade);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload properties when modal opens
  useEffect(() => {
    if (showListProperty && address) {
      loadMyProperties();
      refetchApproval();
    }
  }, [showListProperty, address, refetchApproval]);

  // Check approval status when property is selected
  useEffect(() => {
    if (selectedProperty && address) {
      // Check if marketplace is approved for all (better UX)
      if (isApprovedForAll === false) {
        setNeedsApproval(true);
      } else if (isApprovedForAll === true) {
        setNeedsApproval(false);
      }
    }
  }, [selectedProperty, address, isApprovedForAll]);

  useEffect(() => {
    if (isPurchaseSuccess || isListSuccess || isCancelSuccess) {
      setPurchasingId(null);
      setShowListProperty(false);
      setSelectedProperty(null);
      setListingPrice('');
      
      // Wait a bit for backend to process the event, then reload
      // Backend listens to events and updates database automatically
      const reloadTimeout = setTimeout(() => {
        console.log('🔄 Reloading listings after transaction success (backend should have synced)...');
        loadListings();
        if (address) {
          loadMyProperties();
        }
      }, 2000); // Wait 2 seconds for backend event processing
      
      if (isListSuccess && onListed) {
        onListed();
      }
      
      return () => clearTimeout(reloadTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPurchaseSuccess, isListSuccess, isCancelSuccess, address, onListed]);

  const loadListings = async () => {
    setIsLoading(true);
    setLoadingSource('blockchain'); // Always use blockchain as primary source
    try {
      // PRIMARY: Load directly from blockchain (source of truth)
      // Backend sync is optional and only for caching/performance
      console.log('📡 Loading listings directly from blockchain (source of truth)...');
      await loadListingsFromBlockchain();
    } catch (error) {
      console.error('Failed to load listings from blockchain:', error);
      setListings([]);
      setMyListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadListingsFromBlockchain = async () => {
    // PRIMARY: Load directly from blockchain (source of truth)
    // This is the main method - blockchain is always the source of truth for marketplace
    try {
      console.log('📡 Loading listings directly from blockchain (source of truth)...');
      console.log('📍 Marketplace address:', CONTRACTS.Marketplace);
      
      // METHOD 1: Use the new getActiveListings() function (most efficient)
      console.log('🔍 Method 1: Using getActiveListings() from marketplace contract...');
      try {
        const activeListingsDataRaw = await readContract(wagmiConfig, {
          address: CONTRACTS.Marketplace,
          abi: MARKETPLACE_ABI,
          functionName: 'getActiveListings',
          args: [],
        }) as unknown as [readonly bigint[], readonly `0x${string}`[], readonly bigint[]];
        
        const activeListingsData = {
          propertyIds: Array.from(activeListingsDataRaw[0]),
          sellers: Array.from(activeListingsDataRaw[1]),
          prices: Array.from(activeListingsDataRaw[2]),
        };
        
        console.log(`✅ Found ${activeListingsData.propertyIds.length} active listings via getActiveListings()`);
        
        if (activeListingsData.propertyIds.length > 0) {
          // Process the listings
          const processedListings: Listing[] = [];
          for (let i = 0; i < activeListingsData.propertyIds.length; i++) {
            const propertyId = Number(activeListingsData.propertyIds[i]);
            const seller = activeListingsData.sellers[i];
            const price = activeListingsData.prices[i];
            
            try {
              // Get property details
              const propertyDataRaw = await readContract(wagmiConfig, {
                address: CONTRACTS.PropertyNFT,
                abi: PROPERTY_NFT_ABI,
                functionName: 'getProperty',
                args: [BigInt(propertyId)],
              }) as unknown as {
                propertyType: number;
                value: bigint;
                yieldRate: bigint;
              };
              
              const propertyData = {
                propertyType: BigInt(propertyDataRaw.propertyType),
                value: propertyDataRaw.value,
                yieldRate: propertyDataRaw.yieldRate,
              };

              const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
              const propertyTypeNum = Number(propertyData.propertyType);
              
              processedListings.push({
                id: `listing-${propertyId}`,
                propertyId: propertyId.toString(),
                property: {
                  tokenId: propertyId,
                  propertyType: propertyTypes[propertyTypeNum] || 'Residential',
                  value: BigInt(propertyData.value.toString()),
                  yieldRate: Number(propertyData.yieldRate.toString()),
                },
                seller: {
                  walletAddress: seller,
                },
                price: BigInt(price.toString()),
                listingType: 'fixed' as const,
                isActive: true,
              });
              
              console.log(`  ✅ Processed listing for property ${propertyId}`);
            } catch (error) {
              console.error(`  ❌ Failed to get property details for ${propertyId}:`, error);
            }
          }
          
          // Separate my listings from others
          const myListingsFiltered = processedListings.filter((l: Listing) => 
            l.seller.walletAddress?.toLowerCase() === address?.toLowerCase()
          );
          const otherListings = processedListings.filter((l: Listing) => 
            l.seller.walletAddress?.toLowerCase() !== address?.toLowerCase()
          );
          
          console.log(`📊 Listings breakdown: ${myListingsFiltered.length} mine, ${otherListings.length} others`);
          
          setListings(otherListings);
          setMyListings(myListingsFiltered);
          return; // Success, exit early
        } else {
          console.log('ℹ️ No active listings found via getActiveListings()');
        }
      } catch (error: any) {
        console.warn('⚠️ getActiveListings() not available or failed, falling back to manual query:', error.message);
      }
      
      // METHOD 2: Fallback - Get all properties owned by marketplace contract
      console.log('🔍 Method 2: Querying properties owned by marketplace contract...');
      console.log('📍 Marketplace contract address:', CONTRACTS.Marketplace);
      let marketplaceOwnedProperties: bigint[] = [];
      try {
        marketplaceOwnedProperties = await getOwnerProperties(CONTRACTS.Marketplace as `0x${string}`);
        console.log(`✅ Found ${marketplaceOwnedProperties.length} properties owned by marketplace`);
        if (marketplaceOwnedProperties.length > 0) {
          console.log('📋 Marketplace-owned property IDs:', marketplaceOwnedProperties.map(id => Number(id)));
        } else {
          console.log('ℹ️ No properties owned by marketplace. This means:');
          console.log('   - Either no properties have been listed yet');
          console.log('   - Or all listed properties have been sold/cancelled');
        }
      } catch (error: any) {
        console.error('❌ Failed to get marketplace-owned properties:', error);
        console.error('   Error message:', error.message);
        console.error('   This could mean the marketplace contract address is incorrect');
      }

      // METHOD 2: Query PropertyListed events as fallback
      console.log('🔍 Method 2: Querying PropertyListed events...');
      const { createPublicClient, http, fallback, parseAbiItem } = await import('viem');
      const { mantleSepoliaTestnet } = await import('@mantleio/viem/chains');
      
      const rpcUrls = [
        'https://mantle-sepolia.drpc.org',
        'https://rpc.ankr.com/mantle_sepolia',
        'https://rpc.sepolia.mantle.xyz',
        'https://mantle-sepolia-rpc.publicnode.com',
      ];
      
      const publicClient = createPublicClient({
        chain: mantleSepoliaTestnet,
        transport: fallback(rpcUrls.map(url => http(url, { timeout: 10000 }))),
      });

      let eventPropertyIds: bigint[] = [];
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;
        const events = await publicClient.getLogs({
          address: CONTRACTS.Marketplace,
          event: parseAbiItem('event PropertyListed(uint256 indexed propertyId, address indexed seller, uint256 price)'),
          fromBlock: fromBlock,
        });
        eventPropertyIds = events.map(e => BigInt(Number(e.args?.propertyId || 0))).filter(id => id > 0n);
        console.log(`✅ Found ${events.length} PropertyListed events`);
      } catch (error) {
        console.warn('⚠️ Failed to query events:', error);
      }

      // Combine both methods - use marketplace-owned properties first, then events
      const allPropertyIds = Array.from(new Set([
        ...marketplaceOwnedProperties,
        ...eventPropertyIds,
      ]));
      
      console.log(`📋 Total unique property IDs to check: ${allPropertyIds.length}`);
      if (allPropertyIds.length === 0) {
        console.log('⚠️ No property IDs found to check!');
        console.log('   This means:');
        console.log('   1. Marketplace contract owns 0 properties');
        console.log('   2. No PropertyListed events found');
        console.log('   → Properties may not have been listed yet');
        setListings([]);
        setMyListings([]);
        return;
      }

      // Check each property to see if it's listed and active
      const activeListings: Listing[] = [];
      for (const propertyIdBigInt of allPropertyIds) {
        try {
          const propertyId = Number(propertyIdBigInt);
          if (propertyId === 0) continue;
          
          console.log(`🔍 Checking property ${propertyId}...`);
          
          // Check if listing is still active
          const listingDataRaw = await readContract(wagmiConfig, {
            address: CONTRACTS.Marketplace,
            abi: MARKETPLACE_ABI,
            functionName: 'listings',
            args: [BigInt(propertyId)],
          }) as unknown as [bigint, `0x${string}`, bigint, boolean, bigint];
          
          const listingData = {
            propertyId: listingDataRaw[0],
            seller: listingDataRaw[1],
            price: listingDataRaw[2],
            isActive: listingDataRaw[3],
            createdAt: listingDataRaw[4],
          };

          console.log(`  📊 Listing status for property ${propertyId}:`, {
            isActive: listingData.isActive,
            seller: listingData.seller,
            price: listingData.price.toString(),
            priceInTYCOON: (Number(listingData.price) / 1e18).toFixed(4),
            createdAt: new Date(Number(listingData.createdAt) * 1000).toISOString(),
          });

          if (listingData.isActive) {
            console.log(`  ✅ Property ${propertyId} is ACTIVE and listed!`);
            // Get property details
            const propertyDataRaw = await readContract(wagmiConfig, {
              address: CONTRACTS.PropertyNFT,
              abi: PROPERTY_NFT_ABI,
              functionName: 'getProperty',
              args: [BigInt(propertyId)],
            }) as unknown as {
              propertyType: number;
              value: bigint;
              yieldRate: bigint;
            };
            
            const propertyData = {
              propertyType: BigInt(propertyDataRaw.propertyType),
              value: propertyDataRaw.value,
              yieldRate: propertyDataRaw.yieldRate,
            };

            const propertyTypes = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
            const propertyTypeNum = Number(propertyData.propertyType);
            
            activeListings.push({
              id: `listing-${propertyId}`,
              propertyId: propertyId.toString(),
              property: {
                tokenId: propertyId,
                propertyType: propertyTypes[propertyTypeNum] || 'Residential',
                value: BigInt(propertyData.value.toString()),
                yieldRate: Number(propertyData.yieldRate.toString()),
              },
              seller: {
                walletAddress: listingData.seller,
              },
              price: BigInt(listingData.price.toString()),
              listingType: 'fixed' as const,
              isActive: true,
            });
            
            console.log(`  ✅ Added active listing for property ${propertyId}`);
          } else {
            console.log(`  ⏭️  Skipping property ${propertyId} - listing is NOT active`);
            console.log(`     (This property may have been sold or cancelled)`);
          }
        } catch (error) {
          console.error(`❌ Failed to check listing for property ${propertyIdBigInt}:`, error);
        }
      }

      console.log(`✅ Found ${activeListings.length} active listings on blockchain`);

      // Separate my listings from others
      const myListingsFiltered = activeListings.filter((l: Listing) => 
        l.seller.walletAddress?.toLowerCase() === address?.toLowerCase()
      );
      const otherListings = activeListings.filter((l: Listing) => 
        l.seller.walletAddress?.toLowerCase() !== address?.toLowerCase()
      );
      
      console.log(`📊 Listings breakdown: ${myListingsFiltered.length} mine, ${otherListings.length} others`);
      
      setListings(otherListings);
      setMyListings(myListingsFiltered);
    } catch (error) {
      console.error('❌ Failed to load listings from blockchain:', error);
      setListings([]);
      setMyListings([]);
    }
  };

  const loadMyProperties = async (autoSync: boolean = true) => {
    if (!address) {
      setMyProperties([]);
      return;
    }
    try {
      console.log('Loading properties for address:', address);
      
      // Load directly from blockchain first (like the game page does)
      let propertiesFromChain: any[] = [];
      try {
        const tokenIds = await getOwnerProperties(address as `0x${string}`);
        console.log('Found properties on-chain:', tokenIds);
        
        if (tokenIds && tokenIds.length > 0) {
          // Fetch property details for each token
          propertiesFromChain = await Promise.all(
            tokenIds.map(async (tokenId: bigint) => {
              try {
                const propData = await readContract(wagmiConfig, {
                  address: CONTRACTS.PropertyNFT,
                  abi: PROPERTY_NFT_ABI,
                  functionName: 'getProperty',
                  args: [tokenId],
                });
                
                return {
                  tokenId: Number(tokenId),
                  propertyType: ['Residential', 'Commercial', 'Industrial', 'Luxury'][Number(propData.propertyType)] || 'Residential',
                  value: BigInt(propData.value.toString()),
                  yieldRate: Number(propData.yieldRate.toString()),
                  totalYieldEarned: propData.totalYieldEarned ? BigInt(propData.totalYieldEarned.toString()) : undefined,
                  isActive: propData.isActive,
                };
              } catch (error) {
                console.error(`Failed to fetch property ${tokenId}:`, error);
                return null;
              }
            })
          );
          
          // Filter out nulls
          propertiesFromChain = propertiesFromChain.filter(p => p !== null);
          console.log(`Loaded ${propertiesFromChain.length} properties from blockchain`);
        }
      } catch (chainError) {
        console.error('Failed to load properties from chain:', chainError);
      }
      
      // Try to load from database (for coordinates and other metadata)
      let propertiesFromDb: any[] = [];
      try {
        propertiesFromDb = await api.get(`/properties/owner/${address}`);
        console.log('Loaded properties from database:', propertiesFromDb.length);
      } catch (dbError) {
        console.warn('Failed to load from database (will use chain data):', dbError);
      }
      
      // Merge: use chain data as source of truth, add DB metadata if available
      const mergedProperties = propertiesFromChain.map((chainProp: any) => {
        const dbProp = propertiesFromDb.find((p: any) => p.tokenId === chainProp.tokenId);
        return {
          ...chainProp,
          // Add DB metadata if available
          x: dbProp?.x,
          y: dbProp?.y,
          id: dbProp?.id || `prop-${chainProp.tokenId}`,
        };
      });
      
      console.log(`Total properties available: ${mergedProperties.length}`);
      setMyProperties(mergedProperties);
      
      // If we have properties from chain but not in DB, try to sync them (optional)
      if (mergedProperties.length > 0 && propertiesFromDb.length === 0 && autoSync) {
        console.log('Properties found on-chain but not in DB, attempting sync...');
        try {
          await api.post(`/properties/sync/${address}`).catch(() => {
            // Ignore sync errors, we already have the properties from chain
            console.log('Sync failed but properties are available from chain');
          });
        } catch (syncError) {
          console.log('Sync failed but properties are available from chain');
        }
      }
    } catch (error) {
      console.error('Failed to load my properties:', error);
      setMyProperties([]);
    }
  };

  const approveProperty = async () => {
    if (!address || !isConnected) return;
    
    try {
      console.log('🔄 Approving marketplace for all properties...');
      // Use setApprovalForAll for better UX (approve once for all properties)
      writeApprove({
        address: CONTRACTS.PropertyNFT,
        abi: PROPERTY_NFT_ABI,
        functionName: 'setApprovalForAll',
        args: [CONTRACTS.Marketplace, true],
      });
      console.log('✅ Approval transaction submitted');
    } catch (error: any) {
      console.error('❌ Failed to approve marketplace:', error);
      
      // Check if it's an RPC error
      if (error.message?.includes('fetch') || error.message?.includes('HTTP') || error.message?.includes('network')) {
        alert('Network error: RPC endpoint is unavailable. Please try again in a moment. The system will automatically retry with fallback RPCs.');
      } else {
        alert(error.message || 'Failed to approve marketplace. Please check your wallet connection and try again.');
      }
    }
  };

  // Refetch approval after successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchApproval();
    }
  }, [isApproveSuccess, refetchApproval]);

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
        value: listing.price as bigint,
      } as any);
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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  console.log('🔄 Manual refresh clicked');
                  loadListings();
                }}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-white border-white/20 hover:bg-white/10"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Loading marketplace...</p>
            <p className="text-xs mt-2">Querying blockchain for listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No properties for sale</p>
            <p className="text-xs mt-2 text-gray-500">
              {myListings.length > 0 
                ? `You have ${myListings.length} listed property${myListings.length > 1 ? 'ies' : ''} (see "My Listings" below)`
                : 'List a property to get started'}
            </p>
            <Button
              onClick={() => {
                console.log('🔄 Manual refresh from empty state');
                loadListings();
              }}
              variant="outline"
              size="sm"
              className="mt-4 text-white border-white/20 hover:bg-white/10"
            >
              Refresh Listings
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.filter(l => l.property).map((listing) => (
              <div
                key={listing.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">
                        {listing.property?.propertyType || 'Unknown'} Property #{listing.property?.tokenId || 'N/A'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                        {listing.listingType === 'auction' ? 'Auction' : 'Fixed Price'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Seller: {listing.seller.username || `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Value: {listing.property?.value ? formatValue(listing.property.value) : 'N/A'} TYCOON</span>
                      <span>Yield: {listing.property?.yieldRate ? listing.property.yieldRate / 100 : 'N/A'}% APY</span>
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
                      disabled={!isConnected || purchasingId === listing.id || isPurchasePending || isPurchaseConfirming || !listing.property}
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
              {myListings.filter(l => l.property).map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">
                          {listing.property?.propertyType || 'Unknown'} Property #{listing.property?.tokenId || 'N/A'}
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
                      onClick={() => cancelListing(listing.property?.tokenId || 0)}
                      disabled={isCancelPending || isCancelConfirming || !listing.property}
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
                        <p className="text-sm text-gray-400 mb-2">No properties found in database.</p>
                        {address && (
                          <>
                            <p className="text-xs text-gray-500 mb-3">
                              Click "Sync from Chain" to fetch your properties from the blockchain.
                            </p>
                            <Button
                              onClick={async () => {
                                try {
                                  setIsLoading(true);
                                  console.log('Manually syncing properties from chain...');
                                  await api.post(`/properties/sync/${address}`);
                                  // Reload properties after sync
                                  await loadMyProperties();
                                } catch (error) {
                                  console.error('Failed to sync properties:', error);
                                  alert('Failed to sync properties. Please try again.');
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={isLoading}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              {isLoading ? 'Syncing...' : 'Sync from Chain'}
                            </Button>
                          </>
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
                        {(() => {
                          const availableProperties = myProperties.filter((p: any) => {
                            const propTokenId = p.tokenId || p.token_id;
                            if (!propTokenId) {
                              console.warn('Property missing tokenId:', p);
                              return false;
                            }
                            
                            // Filter out properties that are already listed
                            const isListed = myListings.some((l: Listing) => {
                              const listingTokenId = l.property?.tokenId || l.propertyId;
                              return Number(listingTokenId) === Number(propTokenId);
                            });
                            
                            return !isListed;
                          });
                          
                          console.log(`Available properties for dropdown: ${availableProperties.length} out of ${myProperties.length}`);
                          
                          if (availableProperties.length === 0 && myProperties.length > 0) {
                            console.warn('All properties are filtered out. Properties:', myProperties);
                            console.warn('My listings:', myListings);
                          }
                          
                          return availableProperties.map((prop: any) => {
                            const tokenId = prop.tokenId || prop.token_id;
                            const propertyType = prop.propertyType || prop.property_type || 'Unknown';
                            const value = prop.value || '0';
                            const valueStr = typeof value === 'bigint' ? value.toString() : (value?.toString() || '0');
                            return (
                              <option key={tokenId} value={tokenId}>
                                {propertyType} #{tokenId} - {formatValue(BigInt(valueStr))} TYCOON
                              </option>
                            );
                          });
                        })()}
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
                {(needsApproval || isApprovedForAll === false) ? (
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

