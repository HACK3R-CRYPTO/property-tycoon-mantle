import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

  async findAll() {
    return this.db
      .select({
        id: schema.properties.id,
        tokenId: schema.properties.tokenId,
        ownerId: schema.properties.ownerId,
        propertyType: schema.properties.propertyType,
        value: schema.properties.value,
        yieldRate: schema.properties.yieldRate,
        rwaContract: schema.properties.rwaContract,
        rwaTokenId: schema.properties.rwaTokenId,
        totalYieldEarned: schema.properties.totalYieldEarned,
        x: schema.properties.x,
        y: schema.properties.y,
        isActive: schema.properties.isActive,
        createdAt: schema.properties.createdAt,
        updatedAt: schema.properties.updatedAt,
        owner: {
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
      })
      .from(schema.properties)
      .leftJoin(schema.users, eq(schema.properties.ownerId, schema.users.id));
  }

  async findById(id: string) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);
    return property;
  }

  async findByOwner(ownerId: string) {
    return this.db
      .select({
        id: schema.properties.id,
        tokenId: schema.properties.tokenId,
        ownerId: schema.properties.ownerId,
        propertyType: schema.properties.propertyType,
        value: schema.properties.value,
        yieldRate: schema.properties.yieldRate,
        rwaContract: schema.properties.rwaContract,
        rwaTokenId: schema.properties.rwaTokenId,
        totalYieldEarned: schema.properties.totalYieldEarned,
        x: schema.properties.x,
        y: schema.properties.y,
        isActive: schema.properties.isActive,
        createdAt: schema.properties.createdAt,
        updatedAt: schema.properties.updatedAt,
      })
      .from(schema.properties)
      .where(eq(schema.properties.ownerId, ownerId));
  }

  async findByWalletAddress(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    this.logger.log(`Finding properties for wallet: ${normalizedAddress}`);
    
    // First try to find user in database
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, normalizedAddress))
      .limit(1);

    // If user doesn't exist, try to sync from chain first
    if (!user) {
      this.logger.log(`User not found for ${normalizedAddress}, attempting to sync from chain...`);
      try {
        const syncedProperties = await this.syncFromChain(walletAddress);
        if (syncedProperties && syncedProperties.length > 0) {
          this.logger.log(`Successfully synced ${syncedProperties.length} properties for ${normalizedAddress}`);
          return syncedProperties;
        }
        // Try again after sync to get user
        [user] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.walletAddress, normalizedAddress))
          .limit(1);
      } catch (error) {
        this.logger.error(`Failed to sync user ${normalizedAddress} from chain: ${error.message}`, error.stack);
        // Don't return empty, try to continue
      }
    }

    if (!user) {
      this.logger.warn(`User ${normalizedAddress} not found in database after sync attempt`);
      return [];
    }

    let properties = await this.findByOwner(user.id);
    this.logger.log(`Found ${properties.length} properties in database for ${normalizedAddress}`);
    
    // If no properties found but user exists, try syncing from chain
    if (properties.length === 0) {
      this.logger.log(`No properties found in database for ${normalizedAddress}, attempting to sync from chain...`);
      try {
        const syncedProperties = await this.syncFromChain(walletAddress);
        if (syncedProperties && syncedProperties.length > 0) {
          this.logger.log(`Successfully synced ${syncedProperties.length} properties for ${normalizedAddress}`);
          return syncedProperties;
        }
        // Try fetching again after sync
        properties = await this.findByOwner(user.id);
      } catch (error) {
        this.logger.error(`Failed to sync properties for ${normalizedAddress}: ${error.message}`, error.stack);
        // Return empty array on error
        return [];
      }
    }

    return properties;
  }

  async create(propertyData: {
    tokenId: number;
    ownerId: string;
    propertyType: string;
    value: bigint;
    yieldRate: number;
    rwaContract?: string;
    rwaTokenId?: number;
  }) {
    const [property] = await this.db
      .insert(schema.properties)
      .values({
        ...propertyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return property;
  }

  async syncFromChain(walletAddress: string) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      
      // Check if contract is initialized
      if (!this.contractsService.propertyNFT) {
        this.logger.error('PropertyNFT contract not initialized');
        throw new Error('Contract not initialized. Please check backend configuration.');
      }

      this.logger.log(`Fetching properties from chain for ${normalizedAddress}...`);
      let properties: bigint[];
      try {
        properties = await this.contractsService.getOwnerProperties(walletAddress);
        // Convert to array if needed
        if (!Array.isArray(properties)) {
          this.logger.warn('getOwnerProperties returned non-array, converting...');
          properties = Array.isArray(properties) ? properties : [];
        }
        this.logger.log(`Found ${properties.length} properties on-chain for ${normalizedAddress}`);
      } catch (error) {
        this.logger.error(`Failed to fetch properties from chain: ${error.message}`, error.stack);
        throw new Error(`Failed to fetch properties from blockchain: ${error.message}`);
      }
      
      // Get or create user
      let [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, normalizedAddress))
        .limit(1);

      if (!user) {
        this.logger.log(`Creating user for ${normalizedAddress}`);
        [user] = await this.db
          .insert(schema.users)
          .values({
            walletAddress: normalizedAddress,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      if (properties.length === 0) {
        this.logger.log(`No properties found on-chain for ${normalizedAddress}`);
        return [];
      }

      let syncedCount = 0;
      let errorCount = 0;
      
      for (const tokenId of properties) {
        try {
          const tokenIdNum = typeof tokenId === 'bigint' ? Number(tokenId) : Number(tokenId);
          this.logger.log(`Syncing property ${tokenIdNum}...`);
          
          const propertyData = await this.contractsService.getProperty(BigInt(tokenIdNum));
          
          const propertyTypeNum = typeof propertyData.propertyType === 'bigint' 
            ? Number(propertyData.propertyType) 
            : Number(propertyData.propertyType);
          
          // Convert yieldRate to basis points
          let yieldRateValue = Number(propertyData.yieldRate.toString());
          if (yieldRateValue > 1e15) {
            yieldRateValue = Number(propertyData.yieldRate.toString()) / 1e18 * 100;
          }
          if (yieldRateValue < 100 && yieldRateValue > 0) {
            yieldRateValue = yieldRateValue * 100;
          }

          // Use upsert to handle duplicates gracefully
          try {
            await this.db
              .insert(schema.properties)
              .values({
                tokenId: tokenIdNum,
                ownerId: user.id,
                propertyType: this.mapPropertyType(propertyTypeNum),
                value: BigInt(propertyData.value.toString()),
                yieldRate: yieldRateValue,
                rwaContract: propertyData.rwaContract !== '0x0000000000000000000000000000000000000000' 
                  ? propertyData.rwaContract 
                  : undefined,
                rwaTokenId: propertyData.rwaTokenId && Number(propertyData.rwaTokenId.toString()) > 0 
                  ? Number(propertyData.rwaTokenId.toString()) 
                  : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: schema.properties.tokenId,
                set: {
                  ownerId: user.id,
                  propertyType: this.mapPropertyType(propertyTypeNum),
                  value: BigInt(propertyData.value.toString()),
                  yieldRate: yieldRateValue,
                  rwaContract: propertyData.rwaContract !== '0x0000000000000000000000000000000000000000' 
                    ? propertyData.rwaContract 
                    : undefined,
                  rwaTokenId: propertyData.rwaTokenId && Number(propertyData.rwaTokenId.toString()) > 0 
                    ? Number(propertyData.rwaTokenId.toString()) 
                    : undefined,
                  updatedAt: new Date(),
                },
              });
            syncedCount++;
            this.logger.log(`✓ Synced property ${tokenIdNum} for ${normalizedAddress}`);
          } catch (dbError: any) {
            errorCount++;
            this.logger.error(`Database error syncing property ${tokenIdNum}: ${dbError.message}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error syncing property ${tokenId}: ${error.message}`, error.stack);
        }
      }

      this.logger.log(`Sync complete: ${syncedCount} new properties synced, ${errorCount} errors for ${normalizedAddress}`);
      const finalProperties = await this.findByOwner(user.id);
      this.logger.log(`Total properties in database for ${normalizedAddress}: ${finalProperties.length}`);
      return finalProperties;
    } catch (error) {
      this.logger.error(`Error syncing properties from chain: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateCoordinates(tokenId: number, x: number, y: number) {
    const [updated] = await this.db
      .update(schema.properties)
      .set({
        x,
        y,
        updatedAt: new Date(),
      })
      .where(eq(schema.properties.tokenId, tokenId))
      .returning();
    return updated;
  }

  private mapPropertyType(type: number): string {
    const types = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
    return types[type] || 'Residential';
  }
}
