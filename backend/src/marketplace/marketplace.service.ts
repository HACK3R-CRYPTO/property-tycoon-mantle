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
      const listings = await this.contractsService.getActiveListings();
      return listings;
    } catch (error) {
      this.logger.error(`Error getting active listings: ${error.message}`);
      throw error;
    }
  }

  async getListing(listingId: number) {
    try {
      const listing = await this.contractsService.getListing(BigInt(listingId));
      return listing;
    } catch (error) {
      this.logger.error(`Error getting listing: ${error.message}`);
      throw error;
    }
  }

  async syncListing(listingId: number, propertyId: string, sellerId: string, price: bigint) {
    const [listing] = await this.db
      .insert(schema.marketplaceListings)
      .values({
        listingId,
        propertyId,
        sellerId,
        price,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return listing;
  }

  async markAsSold(listingId: number, buyerId: string, txHash: string) {
    const [listing] = await this.db
      .update(schema.marketplaceListings)
      .set({
        active: false,
        buyerId,
        soldAt: new Date(),
        transactionHash: txHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.marketplaceListings.listingId, listingId))
      .returning();
    return listing;
  }
}
