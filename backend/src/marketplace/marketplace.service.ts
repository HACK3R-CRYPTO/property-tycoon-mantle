import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

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
