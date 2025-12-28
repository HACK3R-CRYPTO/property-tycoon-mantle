import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { desc, sql, eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

  async syncAllUsersFromChain() {
    // NOTE: Property syncing is OPTIONAL - frontend works 100% from blockchain
    // This is only needed for leaderboard calculations
    // If you want to disable it, set ENABLE_PROPERTY_SYNC=false in .env
    
    if (process.env.ENABLE_PROPERTY_SYNC === 'false') {
      this.logger.log('Property syncing is disabled (frontend works from blockchain)');
      return;
    }

    // Check if contract is initialized
    if (!this.contractsService.propertyNFT) {
      this.logger.warn('PropertyNFT contract not initialized, cannot sync');
      return;
    }

    this.logger.log('Syncing all users\' properties from blockchain (for leaderboard only)...');
    
    try {
      if (!this.contractsService.propertyNFT) {
        this.logger.warn('PropertyNFT contract not initialized, skipping sync');
        return;
      }

      // Strategy: Get all unique owners from properties in database first
      // Then also check blockchain events for any owners we might have missed
      const allUsers = await this.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
        })
        .from(schema.users)
        .limit(100); // Increase limit

      this.logger.log(`Found ${allUsers.length} users in database to sync`);

      // Sync properties for each user in database
      const syncedAddresses = new Set<string>();
      for (const user of allUsers) {
        try {
          const normalized = user.walletAddress.toLowerCase();
          syncedAddresses.add(normalized);
          await this.syncUserPropertiesFromChain(user.walletAddress);
          // Update leaderboard for this user
          await this.updateLeaderboard(user.id);
        } catch (error) {
          this.logger.error(`Failed to sync properties for user ${user.walletAddress}: ${error.message}`);
          // Continue with other users even if one fails
        }
      }

      // Also discover new owners from blockchain by checking PropertyCreated events
      try {
        this.logger.log('Discovering new property owners from blockchain events...');
        const propertyCreatedFilter = this.contractsService.propertyNFT.filters.PropertyCreated();
        const events = await this.contractsService.propertyNFT.queryFilter(propertyCreatedFilter);
        
        const uniqueOwners = new Set<string>();
        for (const event of events) {
          if (event.args && event.args.owner) {
            const owner = event.args.owner.toLowerCase();
            if (!syncedAddresses.has(owner)) {
              uniqueOwners.add(owner);
            }
          }
        }

        this.logger.log(`Found ${uniqueOwners.size} new owners from blockchain events`);

        // Sync properties for newly discovered owners
        for (const ownerAddress of uniqueOwners) {
          try {
            await this.syncUserPropertiesFromChain(ownerAddress);
            // Get the user ID after sync (user should be created)
            const [user] = await this.db
              .select()
              .from(schema.users)
              .where(eq(schema.users.walletAddress, ownerAddress))
              .limit(1);
            
            if (user) {
              await this.updateLeaderboard(user.id);
            }
          } catch (error) {
            this.logger.error(`Failed to sync newly discovered owner ${ownerAddress}: ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error discovering owners from events: ${error.message}`);
        // Continue even if event query fails
      }
      
      this.logger.log(`Sync complete: ${allUsers.length} existing users synced`);
    } catch (error) {
      this.logger.error(`Error syncing users from chain: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getContractAddresses(): string[] {
    // Get all contract addresses to exclude from leaderboard
    const addresses: string[] = [];
    
    if (this.contractsService.marketplace?.address) {
      addresses.push(this.contractsService.marketplace.address.toLowerCase());
    }
    if (this.contractsService.yieldDistributor?.address) {
      addresses.push(this.contractsService.yieldDistributor.address.toLowerCase());
    }
    if (this.contractsService.questSystem?.address) {
      addresses.push(this.contractsService.questSystem.address.toLowerCase());
    }
    if (this.contractsService.propertyNFT?.address) {
      addresses.push(this.contractsService.propertyNFT.address.toLowerCase());
    }
    if (this.contractsService.gameToken?.address) {
      addresses.push(this.contractsService.gameToken.address.toLowerCase());
    }
    
    // Also exclude old marketplace if set
    const oldMarketplace = process.env.OLD_MARKETPLACE_ADDRESS;
    if (oldMarketplace) {
      addresses.push(oldMarketplace.toLowerCase());
    }
    
    return addresses;
  }

  async getGlobalLeaderboard(limit: number = 100) {
    const contractAddresses = this.getContractAddresses();
    
    // Try to get leaderboard from database first
    try {
      const rankings = await this.db
        .select({
          userId: schema.leaderboard.userId,
          totalPortfolioValue: schema.leaderboard.totalPortfolioValue,
          totalYieldEarned: schema.leaderboard.totalYieldEarned,
          propertiesOwned: schema.leaderboard.propertiesOwned,
          questsCompleted: schema.leaderboard.questsCompleted,
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        })
        .from(schema.leaderboard)
        .leftJoin(schema.users, eq(schema.leaderboard.userId, schema.users.id))
        .orderBy(desc(schema.leaderboard.totalPortfolioValue))
        .limit(limit * 2); // Get more to filter out contracts
      
      // Filter out contract addresses
      const filteredRankings = rankings.filter(r => {
        if (!r.walletAddress) return false;
        const address = r.walletAddress.toLowerCase();
        return !contractAddresses.includes(address);
      }).slice(0, limit);

      // Check if leaderboard has valid data (non-zero values)
      const hasValidData = rankings.some(r => 
        (r.totalPortfolioValue && r.totalPortfolioValue !== '0' && r.totalPortfolioValue !== '0.0') ||
        (r.propertiesOwned && r.propertiesOwned > 0)
      );

      // If we have rankings with valid data, return them
      if (filteredRankings.length > 0 && hasValidData) {
        return filteredRankings.map((r, index) => ({
          ...r,
          rank: index + 1,
          // Convert string values (NUMERIC) to strings for JSON serialization
          totalPortfolioValue: r.totalPortfolioValue ? String(r.totalPortfolioValue) : '0',
          totalYieldEarned: r.totalYieldEarned ? String(r.totalYieldEarned) : '0',
        }));
      }

      // If leaderboard exists but has no valid data, return it anyway (don't block on update)
      // Updates should happen via event indexer or manual sync, not on every request
      if (filteredRankings.length > 0 && !hasValidData) {
        this.logger.warn('Leaderboard has entries but values are zero. Run sync to update.');
        // Return the data anyway (fast response)
        return filteredRankings.map((r, index) => ({
          ...r,
          rank: index + 1,
          totalPortfolioValue: r.totalPortfolioValue ? String(r.totalPortfolioValue) : '0',
          totalYieldEarned: r.totalYieldEarned ? String(r.totalYieldEarned) : '0',
        }));
      }
    } catch (error) {
      this.logger.warn(`Error fetching leaderboard from database: ${error.message}`);
    }

    // If database is empty or failed, calculate from blockchain directly
    this.logger.log('Database leaderboard empty or invalid, calculating from blockchain...');
    return await this.calculateLeaderboardFromBlockchain(limit);
  }

  private async calculateLeaderboardFromBlockchain(limit: number = 100) {
    if (!this.contractsService.propertyNFT) {
      this.logger.warn('PropertyNFT contract not initialized, cannot calculate leaderboard from blockchain');
      return [];
    }

    try {
      // First, discover property owners from blockchain events (chunk queries to avoid RPC limit)
      const discoveredOwners = new Set<string>();
      try {
        this.logger.log('Discovering property owners from blockchain events...');
        const currentBlock = await this.contractsService.getProvider().getBlockNumber();
        const fromBlock = 0;
        const chunkSize = 10000; // RPC limit
        
        for (let i = fromBlock; i <= currentBlock; i += chunkSize) {
          const toBlock = Math.min(i + chunkSize - 1, currentBlock);
          if (i > toBlock) break;
          
          try {
            const propertyCreatedFilter = this.contractsService.propertyNFT.filters.PropertyCreated();
            const events = await this.contractsService.propertyNFT.queryFilter(propertyCreatedFilter, i, toBlock);
            
            for (const event of events) {
              if (event.args && event.args.owner) {
                discoveredOwners.add(event.args.owner.toLowerCase());
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to query events from block ${i} to ${toBlock}: ${error.message}`);
          }
        }
        this.logger.log(`Found ${discoveredOwners.size} unique property owners from events`);
      } catch (error) {
        this.logger.warn(`Failed to discover owners from events: ${error.message}`);
      }

      // Get all users from database
      const dbUsers = await this.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        })
        .from(schema.users)
        .limit(100);

      // Get contract addresses to exclude
      const contractAddresses = this.getContractAddresses();
      
      // Combine database users with discovered owners (exclude contracts)
      const allAddresses = new Set<string>();
      dbUsers.forEach(u => {
        const addr = u.walletAddress.toLowerCase();
        if (!contractAddresses.includes(addr)) {
          allAddresses.add(addr);
        }
      });
      discoveredOwners.forEach(addr => {
        if (!contractAddresses.includes(addr)) {
          allAddresses.add(addr);
        }
      });

      // Create users for discovered owners who aren't in database (exclude contracts)
      for (const address of discoveredOwners) {
        if (contractAddresses.includes(address)) {
          continue; // Skip contract addresses
        }
        if (!dbUsers.find(u => u.walletAddress.toLowerCase() === address)) {
          try {
            const [newUser] = await this.db
              .insert(schema.users)
              .values({
                walletAddress: address,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            dbUsers.push({
              id: newUser.id,
              walletAddress: newUser.walletAddress,
              username: newUser.username,
            });
            this.logger.log(`Created user for discovered owner: ${address}`);
          } catch (error) {
            this.logger.warn(`Failed to create user for ${address}: ${error.message}`);
          }
        }
      }

      this.logger.log(`Calculating leaderboard from blockchain for ${dbUsers.length} users...`);

      // Filter out contract addresses from dbUsers
      const userAddresses = dbUsers.filter(u => {
        const addr = u.walletAddress.toLowerCase();
        return !contractAddresses.includes(addr);
      });

      const leaderboardEntries = await Promise.all(
        userAddresses.map(async (user) => {
          try {
            // Get properties from blockchain
            const tokenIds = await this.contractsService.getOwnerProperties(user.walletAddress);
            if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
              this.logger.debug(`No properties found for ${user.walletAddress}`);
              return null; // No properties
            }

            this.logger.log(`Found ${tokenIds.length} properties for ${user.walletAddress}`);

            // Calculate portfolio value from blockchain
            let totalPortfolioValue = BigInt(0);
            let totalYieldEarned = BigInt(0);

            for (const tokenId of tokenIds) {
              try {
                const propData = await this.contractsService.getProperty(BigInt(Number(tokenId)));
                // Value is now stored as string (numeric), convert to BigInt for calculation
                totalPortfolioValue += BigInt(propData.value.toString());
                totalYieldEarned += BigInt(propData.totalYieldEarned?.toString() || '0');
              } catch (error) {
                this.logger.warn(`Failed to get property ${tokenId} for leaderboard: ${error.message}`);
              }
            }

            return {
              userId: user.id,
              walletAddress: user.walletAddress,
              username: user.username,
              totalPortfolioValue: totalPortfolioValue.toString(),
              totalYieldEarned: totalYieldEarned.toString(),
              propertiesOwned: tokenIds.length,
              questsCompleted: 0, // Quests are in database, skip for now
            };
          } catch (error) {
            this.logger.warn(`Failed to calculate stats for ${user.walletAddress}: ${error.message}`);
            return null;
          }
        })
      );

      // Filter out nulls and sort by portfolio value
      const validEntries = leaderboardEntries
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => {
          const aValue = BigInt(a.totalPortfolioValue);
          const bValue = BigInt(b.totalPortfolioValue);
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        })
        .slice(0, limit)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      this.logger.log(`Calculated leaderboard from blockchain: ${validEntries.length} entries`);
      
      if (validEntries.length === 0) {
        this.logger.warn('No leaderboard entries found. Possible reasons:');
        this.logger.warn(`- No users in database: ${dbUsers.length}`);
        this.logger.warn(`- No property owners discovered from events: ${discoveredOwners.size}`);
        this.logger.warn('- Users in database might not have properties on-chain');
        this.logger.warn('- Check backend logs for property fetching errors');
      }
      
      return validEntries;
    } catch (error) {
      this.logger.error(`Error calculating leaderboard from blockchain: ${error.message}`, error.stack);
      return [];
    }
  }

  async updateLeaderboard(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      this.logger.warn(`User ${userId} not found for leaderboard update`);
      return;
    }

    // Skip if this is a contract address
    const contractAddresses = this.getContractAddresses();
    if (contractAddresses.includes(user.walletAddress.toLowerCase())) {
      this.logger.log(`Skipping leaderboard update for contract address: ${user.walletAddress}`);
      return;
    }

    // Sync properties from blockchain first (only if enabled)
    if (process.env.ENABLE_PROPERTY_SYNC !== 'false') {
      try {
        this.logger.log(`Syncing properties from blockchain for user ${user.walletAddress} before leaderboard update`);
        await this.syncUserPropertiesFromChain(user.walletAddress);
      } catch (error) {
        this.logger.error(`Failed to sync properties for leaderboard update: ${error.message}`, error.stack);
        // Continue with database properties even if sync fails
      }
    }

    // Get user's properties (now synced from blockchain)
    let properties = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.ownerId, userId));

    // If no properties in database, try to sync from blockchain directly
    if (properties.length === 0 && this.contractsService.propertyNFT) {
      try {
        this.logger.log(`No properties in DB for user ${user.walletAddress}, syncing from blockchain...`);
        await this.syncUserPropertiesFromChain(user.walletAddress);
        // Try again after sync
        properties = await this.db
          .select()
          .from(schema.properties)
          .where(eq(schema.properties.ownerId, userId));
      } catch (error) {
        this.logger.error(`Failed to sync properties from blockchain: ${error.message}`);
      }
    }

    // Calculate total portfolio value
    // Property value is stored as string (numeric), convert to BigInt for calculation
    const totalPortfolioValue = properties.reduce((sum, prop) => {
      return sum + BigInt(prop.value?.toString() || '0');
    }, BigInt(0));

    // Get completed quests
    const completedQuests = await this.db
      .select()
      .from(schema.questProgress)
      .where(
        and(
          eq(schema.questProgress.userId, userId),
          eq(schema.questProgress.completed, true),
        ),
      );

    // Get total yield earned
    const yieldRecords = await this.db
      .select()
      .from(schema.yieldRecords)
      .where(
        and(
          eq(schema.yieldRecords.ownerId, userId),
          eq(schema.yieldRecords.claimed, true),
        ),
      );

    const totalYieldEarned = yieldRecords.reduce((sum, record) => {
      return sum + BigInt(record.amount.toString());
    }, BigInt(0));

    const [existing] = await this.db
      .select()
      .from(schema.leaderboard)
      .where(eq(schema.leaderboard.userId, userId))
      .limit(1);

    // Convert BigInt to string for numeric columns
    // Ensure values are properly formatted as strings for NUMERIC type
    const totalPortfolioValueStr = totalPortfolioValue.toString();
    const totalYieldEarnedStr = totalYieldEarned.toString();
    
    const leaderboardData: any = {
      userId,
      totalPortfolioValue: totalPortfolioValueStr, // String for NUMERIC column
      totalYieldEarned: totalYieldEarnedStr, // String for NUMERIC column
      propertiesOwned: properties.length,
      questsCompleted: completedQuests.length,
      updatedAt: new Date(),
    };

    try {
      if (existing) {
        await this.db
          .update(schema.leaderboard)
          .set(leaderboardData)
          .where(eq(schema.leaderboard.userId, userId));
      } else {
        await this.db.insert(schema.leaderboard).values(leaderboardData);
      }
    } catch (dbError: any) {
      // Log detailed error for debugging
      this.logger.error(`Database error updating leaderboard: ${dbError.message}`);
      if (dbError.cause) {
        this.logger.error(`PostgreSQL error: ${JSON.stringify(dbError.cause)}`);
      }
      if (dbError.code) {
        this.logger.error(`Error code: ${dbError.code}`);
      }
      if (dbError.detail) {
        this.logger.error(`Error detail: ${dbError.detail}`);
      }
      throw dbError;
    }

    const portfolioValueStr = (Number(totalPortfolioValue) / 1e18).toFixed(2);
    this.logger.log(`Updated leaderboard for user ${userId}: ${properties.length} properties, ${portfolioValueStr} TYCOON portfolio`);
  }

  private async syncUserPropertiesFromChain(walletAddress: string) {
    if (!this.contractsService.propertyNFT) {
      this.logger.error('PropertyNFT contract not initialized! Cannot sync from blockchain.');
      this.logger.error('Please ensure MANTLE_RPC_URL, PRIVATE_KEY, and PROPERTY_NFT_ADDRESS are set in backend .env');
      throw new Error('Contract not initialized. Please check backend configuration.');
    }

    try {
      const normalizedAddress = walletAddress.toLowerCase();
      
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

      // Get properties from blockchain
      let tokenIds: any[];
      try {
        tokenIds = await this.contractsService.getOwnerProperties(walletAddress);
      } catch (error) {
        this.logger.error(`Failed to get properties from blockchain for ${walletAddress}: ${error.message}`);
        return;
      }
      
      if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
        // No properties found, but that's okay
        return;
      }

      // Sync each property
      for (const tokenId of tokenIds) {
        try {
          const tokenIdNum = typeof tokenId === 'bigint' ? Number(tokenId) : Number(tokenId);
          const propData = await this.contractsService.getProperty(BigInt(tokenIdNum));
          
          const propertyTypeNum = typeof propData.propertyType === 'bigint' 
            ? Number(propData.propertyType) 
            : Number(propData.propertyType);
          
          const propertyTypeMap: Record<number, string> = {
            0: 'Residential',
            1: 'Commercial',
            2: 'Industrial',
            3: 'Luxury',
          };

          // Convert yieldRate - it might be in wei format, convert to basis points
          let yieldRateValue = Number(propData.yieldRate.toString());
          // If yieldRate is very large (> 1e15), it's likely in wei format, convert to basis points
          if (yieldRateValue > 1e15) {
            yieldRateValue = Number(propData.yieldRate.toString()) / 1e18 * 100;
          }
          // Ensure it's in basis points (500 = 5%)
          if (yieldRateValue < 100 && yieldRateValue > 0) {
            yieldRateValue = yieldRateValue * 100;
          }

          // Handle rwaTokenId - don't insert if it's 0 (BigInt(0) is truthy, so check explicitly)
          const rwaTokenIdNum = propData.rwaTokenId 
            ? Number(propData.rwaTokenId.toString()) 
            : 0;
          const rwaTokenIdValue = (rwaTokenIdNum && rwaTokenIdNum > 0) ? rwaTokenIdNum : null;
          
          // Convert value to string for numeric column (handles very large numbers)
          const valueStr = typeof propData.value === 'bigint' 
            ? propData.value.toString()
            : propData.value.toString();
          
          const rwaContractValue = propData.rwaContract && propData.rwaContract !== '0x0000000000000000000000000000000000000000' 
            ? propData.rwaContract 
            : undefined;
          
          const propertyTypeStr = propertyTypeMap[propertyTypeNum] || 'Residential';
          
          // Use Drizzle ORM for proper type handling (same as PropertiesService)
          try {
            // Check if property exists
            const [existing] = await this.db
              .select()
              .from(schema.properties)
              .where(eq(schema.properties.tokenId, tokenIdNum))
              .limit(1);

            // Build update/insert object conditionally
            const propertyData: any = {
              ownerId: user.id,
              propertyType: propertyTypeStr,
              value: valueStr, // Use string for numeric column
              yieldRate: yieldRateValue,
              updatedAt: new Date(),
            };

            // Only include rwaContract if it has a value
            if (rwaContractValue) {
              propertyData.rwaContract = rwaContractValue;
            } else {
              propertyData.rwaContract = null;
            }

            // Only include rwaTokenId if it has a value
            if (rwaTokenIdValue !== null && rwaTokenIdValue !== undefined) {
              propertyData.rwaTokenId = rwaTokenIdValue;
            } else {
              propertyData.rwaTokenId = null;
            }

            if (existing) {
              // Update existing property
              await this.db
                .update(schema.properties)
                .set(propertyData)
                .where(eq(schema.properties.tokenId, tokenIdNum));
            } else {
              // Insert new property
              await this.db.insert(schema.properties).values({
                ...propertyData,
                tokenId: tokenIdNum,
                createdAt: new Date(),
              });
            }
            
            this.logger.log(`Upserted property ${tokenIdNum} for ${normalizedAddress}`);
          } catch (dbError: any) {
            const errorMsg = dbError.message || String(dbError);
            this.logger.error(`Failed to upsert property ${tokenIdNum}: ${errorMsg}`);
            if (dbError.stack) {
              this.logger.error(`Stack: ${dbError.stack.substring(0, 500)}`);
            }
            // Continue with next property
          }
        } catch (error) {
          this.logger.error(`Error syncing property ${tokenId}: ${error.message}`);
          // Continue with next property
        }
      }
    } catch (error) {
      this.logger.error(`Error in syncUserPropertiesFromChain for ${walletAddress}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async syncAndUpdateLeaderboard(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Sync properties from chain first (only if enabled)
    if (process.env.ENABLE_PROPERTY_SYNC !== 'false') {
      await this.syncUserPropertiesFromChain(walletAddress);
    }
    
    // Find user
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, normalizedAddress))
      .limit(1);

    if (!user) {
      throw new Error(`User not found for ${walletAddress}`);
    }

    // Update leaderboard
    await this.updateLeaderboard(user.id);
  }
}
