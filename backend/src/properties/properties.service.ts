import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
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
    
    if (!property) return null;
    
    // Convert BigInt values to strings for JSON serialization
    return {
      ...property,
      value: property.value?.toString() || property.value,
      totalYieldEarned: property.totalYieldEarned?.toString() || property.totalYieldEarned,
    };
  }

  async findByOwner(ownerId: string) {
    const properties = await this.db
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
    
    // Convert BigInt values to strings for JSON serialization
    return properties.map(prop => ({
      ...prop,
      value: prop.value?.toString() || prop.value,
      totalYieldEarned: prop.totalYieldEarned?.toString() || prop.totalYieldEarned,
    }));
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

    // NOTE: Frontend loads properties directly from blockchain
    // This endpoint is only for optional features (coordinates, etc.)
    // If property syncing is disabled, skip sync and return database properties only
    if (process.env.ENABLE_PROPERTY_SYNC === 'false') {
      if (!user) {
        this.logger.log(`Property syncing disabled - returning empty array for ${normalizedAddress}`);
        return [];
      }
      const properties = await this.findByOwner(user.id);
      this.logger.log(`Property syncing disabled - returning ${properties.length} properties from database for ${normalizedAddress}`);
      return properties;
    }

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

    // Filter out listed properties by checking ownerOf on blockchain (source of truth)
    // Listed properties are owned by the marketplace contract
    if (this.contractsService.propertyNFT && properties.length > 0) {
      const marketplaceAddress = this.contractsService.marketplace?.address?.toLowerCase();
      const contractAddresses = [
        marketplaceAddress,
        this.contractsService.yieldDistributor?.address?.toLowerCase(),
        this.contractsService.questSystem?.address?.toLowerCase(),
        this.contractsService.propertyNFT?.address?.toLowerCase(),
        '0x6389d7168029715de118baf51b6d32ee1ebea46b', // Old marketplace
      ].filter(Boolean) as string[];

      this.logger.log(`🔍 Filtering ${properties.length} properties to exclude listed ones...`);
      const ownedProperties: typeof properties = [];
      
      for (const prop of properties) {
        try {
          const currentOwner = await this.contractsService.propertyNFT.ownerOf(prop.tokenId);
          const ownerLower = currentOwner.toLowerCase();
          const isOwnedByUser = ownerLower === normalizedAddress;
          const isContract = contractAddresses.includes(ownerLower);
          
          if (isOwnedByUser && !isContract) {
            ownedProperties.push(prop);
            this.logger.debug(`✅ Property ${prop.tokenId} is owned by user`);
          } else {
            this.logger.log(`❌ Property ${prop.tokenId} excluded: owned by ${currentOwner} (${isContract ? 'contract' : 'different user'})`);
          }
        } catch (error) {
          this.logger.warn(`Failed to check ownerOf for property ${prop.tokenId}: ${error.message}`);
          // If ownerOf fails, property doesn't exist in NEW contract (it's from old contract)
          // Exclude it - don't show old properties
          this.logger.log(`❌ Property ${prop.tokenId} excluded: doesn't exist in new contract (from old contract)`);
        }
      }
      
      this.logger.log(`✅ Filtered to ${ownedProperties.length} properties actually owned by user (excluded ${properties.length - ownedProperties.length} listed/transferred)`);
      properties = ownedProperties;
    }

    // Convert BigInt values to strings for JSON serialization
    return properties.map(prop => ({
      ...prop,
      value: prop.value?.toString() || prop.value,
      totalYieldEarned: prop.totalYieldEarned?.toString() || prop.totalYieldEarned,
    }));
  }

  async create(propertyData: {
    tokenId: number;
    ownerId: string;
    propertyType: string;
    value: string; // Changed to string for numeric column
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
    // Skip syncing if disabled
    if (process.env.ENABLE_PROPERTY_SYNC === 'false') {
      this.logger.log(`Property syncing disabled - skipping sync for ${walletAddress}`);
      return [];
    }
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      
      // Check if contract is initialized
      if (!this.contractsService.propertyNFT) {
        this.logger.error('PropertyNFT contract not initialized');
        throw new Error('Contract not initialized. Please check backend configuration.');
      }

      this.logger.log(`Fetching properties from chain for ${normalizedAddress}...`);
      let properties: bigint[] = [];
      try {
        const result = await this.contractsService.getOwnerProperties(walletAddress);
        // Handle different return types
        if (Array.isArray(result)) {
          properties = result;
        } else if (result && typeof result === 'object' && 'length' in result) {
          // Convert array-like object to array
          properties = Array.from(result as any);
        } else {
          this.logger.warn(`getOwnerProperties returned unexpected type: ${typeof result}`);
          properties = [];
        }
        this.logger.log(`Found ${properties.length} properties on-chain for ${normalizedAddress}`);
      } catch (error: any) {
        // If getOwnerProperties fails, user has no properties in new contract
        // Return empty array instead of throwing error
        this.logger.warn(`No properties found in new contract for ${normalizedAddress}: ${error.message}`);
        this.logger.log(`Returning empty array - user may not have properties yet in new contract`);
        return [];
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
          
          // Get contract's createdAt timestamp (source of truth for yield calculation)
          const contractCreatedAtTimestamp = Number(propertyData.createdAt);
          const contractCreatedAt = new Date(contractCreatedAtTimestamp * 1000); // Convert seconds to milliseconds
          
          const propertyTypeNum = typeof propertyData.propertyType === 'bigint' 
            ? Number(propertyData.propertyType) 
            : Number(propertyData.propertyType);
          
          // Convert yieldRate to basis points
          let yieldRateValue = Number(propertyData.yieldRate.toString());
          
          // Detect corrupted yieldRate (stored in wei instead of basis points)
          // Normal yieldRate should be 100-1000 (1%-10%), corrupted would be > 1e15
          if (yieldRateValue > 1e15) {
            this.logger.warn(`Property ${tokenId}: Detected corrupted yieldRate ${yieldRateValue}. Attempting to fix...`);
            // Try to convert from wei to basis points
            // If it's around 5e16, it might be 500 * 1e14 (corrupted)
            // Or if it's around 5e16, it might be 500 * 1e14 (corrupted)
            const possibleBasisPoints = yieldRateValue / 1e14; // Try dividing by 1e14
            if (possibleBasisPoints >= 100 && possibleBasisPoints <= 10000) {
              yieldRateValue = Math.round(possibleBasisPoints);
              this.logger.log(`Property ${tokenId}: Fixed yieldRate from ${propertyData.yieldRate.toString()} to ${yieldRateValue} basis points`);
            } else {
              // Fallback: assume it should be 500 (5% - most common)
              yieldRateValue = 500;
              this.logger.warn(`Property ${tokenId}: Could not auto-fix yieldRate, defaulting to 500 basis points`);
            }
          }
          
          // Ensure yieldRate is in valid range (100-10000 basis points = 1%-100%)
          if (yieldRateValue < 100 || yieldRateValue > 10000) {
            this.logger.warn(`Property ${tokenId}: yieldRate ${yieldRateValue} out of valid range (100-10000), defaulting to 500`);
            yieldRateValue = 500;
          }
          
          // Handle legacy format (0-1 range instead of basis points)
          if (yieldRateValue < 100 && yieldRateValue > 0) {
            yieldRateValue = yieldRateValue * 100;
          }

          // Convert value to string for numeric column (handles very large numbers)
          // The schema uses numeric which expects a string representation
          let valueStr: string;
          if (typeof propertyData.value === 'bigint') {
            valueStr = propertyData.value.toString();
          } else if (typeof propertyData.value === 'string') {
            valueStr = propertyData.value;
          } else {
            valueStr = propertyData.value.toString();
          }
          
          // Handle rwaTokenId - set to undefined if not valid (will be NULL in database)
          let rwaTokenIdValue: number | undefined;
          if (propertyData.rwaTokenId) {
            const rwaTokenIdNum = Number(propertyData.rwaTokenId.toString());
            if (rwaTokenIdNum && rwaTokenIdNum > 0) {
              rwaTokenIdValue = rwaTokenIdNum;
            } else {
              rwaTokenIdValue = undefined;
            }
          } else {
            rwaTokenIdValue = undefined;
          }
          
          // Handle rwaContract - check for valid address, set to undefined if invalid
          let rwaContractValue: string | undefined;
          if (propertyData.rwaContract && 
              propertyData.rwaContract !== '0x0000000000000000000000000000000000000000' &&
              propertyData.rwaContract.trim() !== '' &&
              propertyData.rwaContract.length === 42) {
            rwaContractValue = propertyData.rwaContract;
          } else {
            rwaContractValue = undefined; // Will be NULL in database
          }
          
          const propertyTypeStr = this.mapPropertyType(propertyTypeNum);
          
          // Use Drizzle ORM for proper type handling
          try {
            // Check if property exists
            const [existing] = await this.db
              .select()
              .from(schema.properties)
              .where(eq(schema.properties.tokenId, tokenIdNum))
              .limit(1);

            // Build property data object - only include optional fields if they have values
            // Use string for numeric column to handle very large values
            const propertyDataObj: any = {
              ownerId: user.id,
              propertyType: propertyTypeStr,
              value: valueStr, // Use string for numeric column (handles values > BIGINT max)
              yieldRate: yieldRateValue,
              updatedAt: new Date(),
            };

            // Only include rwaContract if it has a valid value
            // If omitted, Drizzle will use NULL for optional fields
            if (rwaContractValue && rwaContractValue !== '0x0000000000000000000000000000000000000000' && rwaContractValue !== '') {
              propertyDataObj.rwaContract = rwaContractValue;
            }
            // Don't include if null/undefined - Drizzle will use NULL

            // Only include rwaTokenId if it has a valid value
            if (rwaTokenIdValue !== null && rwaTokenIdValue !== undefined && rwaTokenIdValue > 0) {
              propertyDataObj.rwaTokenId = rwaTokenIdValue;
            }
            // Don't include if null/undefined - Drizzle will use NULL

            if (existing) {
              // Update existing property (preserve createdAt if it's already correct, or update if it was wrong)
              // Only update createdAt if it's significantly different from contract (more than 1 hour difference)
              const existingCreatedAt = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
              const contractCreatedAtMs = contractCreatedAt.getTime();
              const timeDiff = Math.abs(existingCreatedAt - contractCreatedAtMs);
              
              // If createdAt differs by more than 1 hour, update it to match contract
              if (timeDiff > 3600000) { // 1 hour in milliseconds
                this.logger.log(`Updating createdAt for property ${tokenIdNum} to match contract (diff: ${Math.floor(timeDiff / 1000 / 60)} minutes)`);
                await this.db
                  .update(schema.properties)
                  .set({
                    ...propertyDataObj,
                    createdAt: contractCreatedAt, // Update to contract's createdAt
                  })
                  .where(eq(schema.properties.tokenId, tokenIdNum));
              } else {
                // Just update other fields, keep existing createdAt
                await this.db
                  .update(schema.properties)
                  .set(propertyDataObj)
                  .where(eq(schema.properties.tokenId, tokenIdNum));
              }
            } else {
              // Insert new property with contract's createdAt (source of truth)
              await this.db.insert(schema.properties).values({
                ...propertyDataObj,
                tokenId: tokenIdNum,
                createdAt: contractCreatedAt, // Use contract's createdAt, not current time
              });
              this.logger.log(`Inserted property ${tokenIdNum} with contract createdAt: ${contractCreatedAt.toISOString()}`);
            }
            
            this.logger.log(`✓ Upserted property ${tokenIdNum} for ${normalizedAddress}`);
            syncedCount++;
          } catch (dbError: any) {
            errorCount++;
            const errorMsg = dbError.message || String(dbError);
            this.logger.error(`Database error syncing property ${tokenIdNum}: ${errorMsg}`);
            // Log the actual PostgreSQL error if available
            if (dbError.cause) {
              this.logger.error(`PostgreSQL error: ${JSON.stringify(dbError.cause)}`);
            }
            if (dbError.code) {
              this.logger.error(`Error code: ${dbError.code}`);
            }
            if (dbError.detail) {
              this.logger.error(`Error detail: ${dbError.detail}`);
            }
            if (dbError.stack) {
              this.logger.error(`Stack: ${dbError.stack.substring(0, 500)}`);
            }
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error syncing property ${tokenId}: ${error.message}`, error.stack);
        }
      }

      this.logger.log(`Sync complete: ${syncedCount} new properties synced, ${errorCount} errors for ${normalizedAddress}`);
      const finalProperties = await this.findByOwner(user.id);
      this.logger.log(`Total properties in database for ${normalizedAddress}: ${finalProperties.length}`);
      // Convert BigInt values to strings for JSON serialization
      return finalProperties.map(prop => ({
        ...prop,
        value: prop.value?.toString() || prop.value,
        totalYieldEarned: prop.totalYieldEarned?.toString() || prop.totalYieldEarned,
      }));
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

  /**
   * Sync ALL existing properties from blockchain to database
   * This is needed for properties created before the backend was running
   * Queries all PropertyCreated events from contract deployment
   */
  async syncAllExistingPropertiesFromChain() {
    // Skip syncing if disabled
    if (process.env.ENABLE_PROPERTY_SYNC === 'false') {
      this.logger.log('Property syncing disabled - skipping full sync');
      return { synced: 0, owners: 0 };
    }

    if (!this.contractsService.propertyNFT) {
      this.logger.error('PropertyNFT contract not initialized');
      throw new Error('Contract not initialized');
    }

    try {
      this.logger.log('🔄 Starting full sync of all existing properties from blockchain...');

      // Get current block and contract deployment block
      const provider = this.contractsService.getProvider();
      const currentBlock = await provider.getBlockNumber();
      
      // Try to get contract deployment block, or start from a reasonable block
      // For Mantle Sepolia, we'll query in chunks of 10,000 blocks (RPC limit)
      const CHUNK_SIZE = 10000;
      const filter = this.contractsService.propertyNFT.filters.PropertyCreated();
      
      // Start from block 0 or contract deployment (if known)
      // For now, start from a recent block to avoid too many queries
      // You can adjust this based on when your contract was deployed
      const startBlock = Math.max(0, currentBlock - 50000); // Last 50k blocks
      const allEvents: any[] = [];
      
      this.logger.log(`📡 Querying events from block ${startBlock} to ${currentBlock} in chunks of ${CHUNK_SIZE}...`);
      
      // Query in chunks to respect RPC limits
      for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += CHUNK_SIZE) {
        const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
        try {
          this.logger.log(`  Querying blocks ${fromBlock} to ${toBlock}...`);
          const chunkEvents = await this.contractsService.propertyNFT.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...chunkEvents);
          this.logger.log(`  Found ${chunkEvents.length} events in this chunk`);
        } catch (error: any) {
          this.logger.warn(`  Failed to query blocks ${fromBlock}-${toBlock}: ${error.message}`);
          // Continue with next chunk
        }
      }
      
      const events = allEvents;
      this.logger.log(`📡 Found ${events.length} PropertyCreated events in blockchain history`);

      // Get unique owners from events
      const uniqueOwners = new Set<string>();
      for (const event of events) {
        if (event.args && event.args.owner) {
          uniqueOwners.add(event.args.owner.toLowerCase());
        }
      }

      this.logger.log(`👥 Found ${uniqueOwners.size} unique property owners`);

      let totalSynced = 0;
      const syncedOwners = new Set<string>();

      // Sync properties for each owner
      for (const ownerAddress of uniqueOwners) {
        try {
          this.logger.log(`🔄 Syncing properties for ${ownerAddress}...`);
          const properties = await this.syncFromChain(ownerAddress);
          if (properties.length > 0) {
            totalSynced += properties.length;
            syncedOwners.add(ownerAddress);
            this.logger.log(`✅ Synced ${properties.length} properties for ${ownerAddress}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to sync properties for ${ownerAddress}: ${error.message}`);
        }
      }

      this.logger.log(`✅ Full sync complete: ${totalSynced} properties synced for ${syncedOwners.size} owners`);
      return {
        synced: totalSynced,
        owners: syncedOwners.size,
        totalEvents: events.length,
      };
    } catch (error) {
      this.logger.error(`Failed to sync all existing properties: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cleanupOldProperties() {
    // Clean up properties that don't exist in the new contract
    // (properties from old contract that fail ownerOf check)
    if (!this.contractsService.propertyNFT) {
      this.logger.error('PropertyNFT contract not initialized');
      throw new Error('Contract not initialized');
    }

    this.logger.log('🧹 Starting cleanup of old properties (checking against new contract)...');
    const allProperties = await this.db
      .select({
        id: schema.properties.id,
        tokenId: schema.properties.tokenId,
      })
      .from(schema.properties);

    let deleted = 0;
    const errors: string[] = [];

    for (const prop of allProperties) {
      try {
        // Try to get ownerOf - if it fails, property doesn't exist in new contract
        await this.contractsService.propertyNFT.ownerOf(prop.tokenId);
        // If successful, property exists in new contract - keep it
      } catch (error) {
        // ownerOf failed - property doesn't exist in new contract, delete it
        try {
          await this.db
            .delete(schema.properties)
            .where(eq(schema.properties.id, prop.id));
          deleted++;
          this.logger.log(`🗑️ Deleted property ${prop.tokenId} (doesn't exist in new contract)`);
        } catch (deleteError: any) {
          errors.push(`Failed to delete property ${prop.tokenId}: ${deleteError.message}`);
          this.logger.error(`Failed to delete property ${prop.tokenId}: ${deleteError.message}`);
        }
      }
    }

    this.logger.log(`✅ Cleanup complete: deleted ${deleted} old properties from database`);
    if (errors.length > 0) {
      this.logger.warn(`⚠️ ${errors.length} errors during cleanup`);
    }

    return { deleted, errors };
  }
}
