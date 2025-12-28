import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
    @Inject(forwardRef(() => PropertiesService)) private propertiesService: PropertiesService,
  ) {}

  async syncListingsFromBlockchain() {
    try {
      this.logger.log('🔄 Syncing marketplace listings from blockchain...');
      
      if (!this.contractsService.marketplace) {
        this.logger.error('Marketplace contract not initialized');
        throw new Error('Marketplace contract not initialized');
      }

      if (!this.contractsService.propertyNFT) {
        this.logger.error('PropertyNFT contract not initialized');
        throw new Error('PropertyNFT contract not initialized');
      }

      const marketplaceAddress = this.contractsService.marketplace.address;
      this.logger.log(`Using marketplace address: ${marketplaceAddress}`);
      this.logger.log(`Marketplace address check: Is it the new one (0xe9E855ff6EB78055AaE90631468BfC948A1446Bb)? ${marketplaceAddress.toLowerCase() === '0xe9e855ff6eb78055aae90631468bfc948a1446bb' ? 'YES' : 'NO'}`);

      // NEW ARCHITECTURE: Try getActiveListings() first (like frontend), then fallback to direct property ownership check
      this.logger.log('📋 NEW ARCHITECTURE: Try getActiveListings() first (most efficient), then fallback to direct property ownership check');
      
      let propertyIds: bigint[] = [];
      let sellers: string[] = [];
      let prices: bigint[] = [];

      // METHOD 1: Try getActiveListings() first (same as frontend)
      try {
        this.logger.log('🔍 Method 1: Calling marketplace.getActiveListings()...');
        const activeListingsData = await this.contractsService.marketplace.getActiveListings() as any;
        
        this.logger.log(`getActiveListings() returned:`, typeof activeListingsData, Array.isArray(activeListingsData));
        
        if (Array.isArray(activeListingsData) && activeListingsData.length >= 3) {
          propertyIds = Array.isArray(activeListingsData[0]) 
            ? activeListingsData[0].map((id: any) => {
                const idStr = id?.toString() || id?._hex || id;
                return BigInt(idStr);
              })
            : [];
          sellers = Array.isArray(activeListingsData[1]) 
            ? activeListingsData[1].map((s: any) => s?.toString() || s)
            : [];
          prices = Array.isArray(activeListingsData[2]) 
            ? activeListingsData[2].map((p: any) => {
                const pStr = p?.toString() || p?._hex || p;
                return BigInt(pStr);
              })
            : [];
          this.logger.log(`✅ Method 1 SUCCESS: getActiveListings() returned ${propertyIds.length} listings`);
          this.logger.log(`   Property IDs: ${propertyIds.map(id => id.toString()).join(', ')}`);
        } else {
          this.logger.warn('getActiveListings() returned unexpected format, trying Method 2...');
        }
      } catch (error: any) {
        this.logger.warn(`Method 1 failed: getActiveListings() error: ${error.message}`);
        this.logger.warn('Falling back to Method 2: Direct property ownership check...');
      }

      // METHOD 2: If getActiveListings() didn't work, use direct property ownership check
      if (propertyIds.length === 0) {
        try {
          // Step 1: Get all properties owned by the marketplace contract using PropertyNFT.getOwnerProperties()
          this.logger.log(`🔍 Method 2: Calling propertyNFT.getOwnerProperties(${marketplaceAddress})...`);
          const ownedProperties = await this.contractsService.getOwnerProperties(marketplaceAddress) as any;
        
        // Handle different return types from ethers.js
        let ownedPropertyIds: bigint[] = [];
        if (Array.isArray(ownedProperties)) {
          ownedPropertyIds = ownedProperties.map((id: any) => {
            const idStr = id?.toString() || id?._hex || id;
            return BigInt(idStr);
          });
        } else if (ownedProperties && typeof ownedProperties === 'object') {
          if ('_hex' in ownedProperties) {
            ownedPropertyIds = [BigInt(ownedProperties._hex)];
          } else if (Array.isArray(Object.values(ownedProperties))) {
            ownedPropertyIds = Object.values(ownedProperties).map((id: any) => BigInt(id?.toString() || id?._hex || id));
          }
        }

        this.logger.log(`Found ${ownedPropertyIds.length} properties owned by marketplace contract`);

        if (ownedPropertyIds.length === 0) {
          this.logger.log('No properties owned by marketplace - no active listings');
          return { synced: 0, errors: 0 };
        }

        // Step 2: For each property, check if it has an active listing using marketplace.listings()
        for (const propertyId of ownedPropertyIds) {
          try {
            this.logger.log(`Checking listing for property #${propertyId.toString()}...`);
            const listing = await this.contractsService.marketplace.listings(propertyId) as any;
            
            // listings mapping returns: (propertyId, seller, price, isActive, createdAt)
            let isActive = false;
            let seller = '';
            let price = BigInt(0);

            if (listing && Array.isArray(listing) && listing.length >= 4) {
              isActive = listing[3] === true || listing[3] === 'true' || listing[3] === 1 || listing[3] === '1';
              seller = listing[1]?.toString() || '';
              const priceValue = listing[2];
              if (priceValue) {
                price = BigInt(priceValue?.toString() || priceValue?._hex || '0');
              }
            } else if (listing && typeof listing === 'object') {
              // Handle object format
              isActive = listing.isActive === true || listing.isActive === 'true' || listing.isActive === 1 || listing.isActive === '1';
              seller = listing.seller?.toString() || '';
              const priceValue = listing.price;
              if (priceValue) {
                price = BigInt(priceValue?.toString() || priceValue?._hex || '0');
              }
            }

            if (isActive && seller && price > 0) {
              propertyIds.push(propertyId);
              sellers.push(seller);
              prices.push(price);
              this.logger.log(`✅ Active listing: Property #${propertyId.toString()}, Seller: ${seller}, Price: ${price.toString()} wei`);
            } else {
              this.logger.log(`⚠️ Property #${propertyId.toString()} owned by marketplace but not actively listed (isActive: ${isActive}, seller: ${seller || 'none'}, price: ${price.toString()})`);
            }
          } catch (error: any) {
            this.logger.warn(`Error checking listing for property ${propertyId.toString()}: ${error.message}`);
          }
        }

        this.logger.log(`✅ Method 2 SUCCESS: Found ${propertyIds.length} active listings from ${ownedPropertyIds.length} marketplace-owned properties`);
        } catch (error: any) {
          this.logger.error(`Method 2 failed: Error in direct property ownership check: ${error.message}`);
          this.logger.error(`Stack: ${error.stack}`);
        }
      }

      this.logger.log(`Found ${propertyIds.length} active listings on-chain`);

      let syncedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < propertyIds.length; i++) {
        try {
          const propertyId = Number(propertyIds[i]);
          const seller = sellers[i].toLowerCase();
          const price = prices[i].toString();

          // Check if property exists in database
          let [property] = await this.db
            .select()
            .from(schema.properties)
            .where(eq(schema.properties.tokenId, propertyId))
            .limit(1);

          if (!property) {
            // Property doesn't exist, sync it first
            this.logger.log(`Property ${propertyId} not in DB, syncing from blockchain...`);
            await this.propertiesService.syncFromChain(seller);
            
            // Try again
            [property] = await this.db
              .select()
              .from(schema.properties)
              .where(eq(schema.properties.tokenId, propertyId))
              .limit(1);
          }

          if (!property) {
            this.logger.warn(`Property ${propertyId} still not found after sync, skipping...`);
            errorCount++;
            continue;
          }

          // Check if listing exists
          const [existing] = await this.db
            .select()
            .from(schema.marketplaceListings)
            .where(eq(schema.marketplaceListings.propertyId, property.id))
            .limit(1);

          if (existing) {
            // Update existing listing
            await this.db
              .update(schema.marketplaceListings)
              .set({
                price: price,
                isActive: true,
                updatedAt: new Date(),
              })
              .where(eq(schema.marketplaceListings.propertyId, property.id));
          } else {
            // Create new listing
            await this.db.insert(schema.marketplaceListings).values({
              propertyId: property.id,
              sellerId: property.ownerId,
              price: price,
              isActive: true,
              listingType: 'fixed',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          syncedCount++;
          this.logger.log(`✅ Synced listing for property ${propertyId}`);
        } catch (error) {
          this.logger.error(`Error syncing listing for property ${propertyIds[i]}: ${error.message}`);
          errorCount++;
        }
      }

      this.logger.log(`✅ Sync complete: ${syncedCount} synced, ${errorCount} errors`);
      return { synced: syncedCount, errors: errorCount };
    } catch (error) {
      this.logger.error(`Error syncing listings from blockchain: ${error.message}`);
      throw error;
    }
  }

  async getActiveListings() {
    try {
      // Get active listings from database with property and seller details
      const listings = await this.db
        .select({
          id: schema.marketplaceListings.id,
          propertyId: schema.marketplaceListings.propertyId,
          sellerId: schema.marketplaceListings.sellerId,
          price: schema.marketplaceListings.price,
          isActive: schema.marketplaceListings.isActive,
          listingType: schema.marketplaceListings.listingType,
          auctionEndTime: schema.marketplaceListings.auctionEndTime,
          highestBid: schema.marketplaceListings.highestBid,
          highestBidderId: schema.marketplaceListings.highestBidderId,
          createdAt: schema.marketplaceListings.createdAt,
          updatedAt: schema.marketplaceListings.updatedAt,
          property: {
            id: schema.properties.id,
            tokenId: schema.properties.tokenId,
            propertyType: schema.properties.propertyType,
            value: schema.properties.value,
            yieldRate: schema.properties.yieldRate,
          },
          seller: {
            id: schema.users.id,
            walletAddress: schema.users.walletAddress,
            username: schema.users.username,
          },
        })
        .from(schema.marketplaceListings)
        .innerJoin(schema.properties, eq(schema.marketplaceListings.propertyId, schema.properties.id))
        .innerJoin(schema.users, eq(schema.marketplaceListings.sellerId, schema.users.id))
        .where(eq(schema.marketplaceListings.isActive, true));

      // Validate each listing against the contract (source of truth)
      const validatedListings: typeof listings = [];
      for (const listing of listings) {
        try {
          const tokenId = Number(listing.property.tokenId);
          
          // Check if listing is actually active on-chain
          const contractListing = await this.contractsService.getMarketplaceListing(tokenId);
          
          if (contractListing && contractListing.isActive) {
            // Listing is active on-chain, include it
            validatedListings.push(listing);
          } else {
            // Listing is not active on-chain, mark as inactive in database
            this.logger.warn(`Listing for property ${tokenId} is inactive on-chain, updating database...`);
            await this.db
              .update(schema.marketplaceListings)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(schema.marketplaceListings.propertyId, listing.property.id));
          }
        } catch (error) {
          this.logger.error(`Error validating listing for property ${listing.property.tokenId}: ${error.message}`);
          // If validation fails, exclude the listing to be safe
        }
      }

      // Format for frontend
      return validatedListings.map((listing) => ({
        id: listing.id,
        propertyId: listing.property.tokenId.toString(),
        property: {
          tokenId: Number(listing.property.tokenId),
          propertyType: listing.property.propertyType,
          value: listing.property.value?.toString() || '0',
          yieldRate: Number(listing.property.yieldRate),
        },
        seller: {
          walletAddress: listing.seller.walletAddress,
          username: listing.seller.username,
        },
        price: listing.price?.toString() || '0',
        listingType: listing.listingType === 'fixed' ? 'fixed' : 'auction',
        auctionEndTime: listing.auctionEndTime,
        highestBid: listing.highestBid?.toString(),
        isActive: listing.isActive,
      }));
    } catch (error) {
      this.logger.error(`Error getting active listings: ${error.message}`);
      throw error;
    }
  }

  async getListing(propertyId: number) {
    try {
      // Get listing from database by propertyId
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, propertyId))
        .limit(1);

      if (!property) {
        return null;
      }

      const [listing] = await this.db
        .select()
        .from(schema.marketplaceListings)
        .where(eq(schema.marketplaceListings.propertyId, property.id))
        .limit(1);

      return listing;
    } catch (error) {
      this.logger.error(`Error getting listing: ${error.message}`);
      throw error;
    }
  }

  async debugMarketplaceState() {
    try {
      if (!this.contractsService.marketplace || !this.contractsService.propertyNFT) {
        return { error: 'Contracts not initialized' };
      }

      const marketplaceAddress = this.contractsService.marketplace.address;
      const debugInfo: any = {
        marketplaceAddress,
        isNewAddress: marketplaceAddress.toLowerCase() === '0xe9e855ff6eb78055aae90631468bfc948a1446bb',
      };

      // Try getActiveListings()
      try {
        const activeListings = await this.contractsService.marketplace.getActiveListings() as any;
        debugInfo.getActiveListings = {
          success: true,
          type: typeof activeListings,
          isArray: Array.isArray(activeListings),
          length: Array.isArray(activeListings) ? activeListings.length : 'N/A',
          rawData: activeListings,
        };
      } catch (error: any) {
        debugInfo.getActiveListings = {
          success: false,
          error: error.message,
        };
      }

      // Try getOwnerProperties()
      try {
        const ownedProperties = await this.contractsService.getOwnerProperties(marketplaceAddress) as any;
        debugInfo.getOwnerProperties = {
          success: true,
          type: typeof ownedProperties,
          isArray: Array.isArray(ownedProperties),
          length: Array.isArray(ownedProperties) ? ownedProperties.length : 'N/A',
          rawData: ownedProperties,
        };
      } catch (error: any) {
        debugInfo.getOwnerProperties = {
          success: false,
          error: error.message,
        };
      }

      return debugInfo;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getAuction(propertyId: number) {
    try {
      const listing = await this.getListing(propertyId);
      if (!listing || listing.listingType !== 'auction') {
        return null;
      }
      return listing;
    } catch (error) {
      this.logger.error(`Error getting auction: ${error.message}`);
      throw error;
    }
  }
}
