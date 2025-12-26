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
      // Get active listings from database (synced via events)
      return this.db
        .select()
        .from(schema.marketplaceListings)
        .where(eq(schema.marketplaceListings.isActive, true));
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
        .where(eq(schema.properties.tokenId, propertyId.toString()))
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
