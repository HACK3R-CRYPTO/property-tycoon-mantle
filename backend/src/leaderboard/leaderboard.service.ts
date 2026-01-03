import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { desc, sql, eq, and } from 'drizzle-orm';
import * as schema from '../database/schema';
import { ContractsService } from '../contracts/contracts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name)

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
    @Inject(forwardRef(() => UsersService)) private usersService?: UsersService,
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
    
    // Hardcode known old marketplace address (from README)
    addresses.push('0x6389d7168029715de118baf51b6d32ee1ebea46b'.toLowerCase());
    
    return addresses;
  }

  async getGlobalLeaderboard(limit: number = 100, forceRecalculate: boolean = false) {
    const contractAddresses = this.getContractAddresses();
    
    // If forceRecalculate is true, always recalculate from blockchain
    if (forceRecalculate) {
      this.logger.log('Force recalculating leaderboard from blockchain...');
      return await this.calculateLeaderboardFromBlockchain(limit);
    }
    
    // Return cached data immediately (fast response)
    // Event listeners automatically update leaderboard when properties are listed/sold
    // No need to refresh on every request - that's too slow
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

      // For each ranking, verify yield from YieldDistributor if available
      // This ensures yield is always accurate even if database is slightly stale
      // Also updates the database if yield is found, so it persists
      const rankingsWithVerifiedYield = await Promise.all(
        filteredRankings.map(async (r, index) => {
          // Convert to string and check if it's 0
          const dbYield = r.totalYieldEarned ? String(r.totalYieldEarned) : '0';
          const dbYieldBigInt = BigInt(dbYield);
          let verifiedYield = dbYield;
          
          // If yield is 0 in database, try to get it from YieldDistributor
          if (r.walletAddress && dbYieldBigInt === BigInt(0) && this.contractsService.yieldDistributor) {
            this.logger.log(`🔍 Verifying yield for ${r.walletAddress} (DB shows 0, checking YieldDistributor)...`);
            try {
              // Get user's properties
              const result = await this.contractsService.getOwnerProperties(r.walletAddress);
              let tokenIds: bigint[] = [];
              if (Array.isArray(result)) {
                tokenIds = result;
              } else if (result && typeof result === 'object' && 'length' in result) {
                tokenIds = Array.from(result as any);
              }
              
              this.logger.log(`📦 Found ${tokenIds.length} properties for ${r.walletAddress}`);
              
              // Sum yield from YieldDistributor
              let totalYield = BigInt(0);
              for (const tokenId of tokenIds) {
                try {
                  const tokenIdNum = BigInt(Number(tokenId));
                  const yieldEarned = await this.contractsService.yieldDistributor.propertyTotalYieldEarned(tokenIdNum);
                  const yieldValue = BigInt(yieldEarned.toString());
                  this.logger.log(`💰 Property ${tokenIdNum}: yield from YieldDistributor = ${yieldValue.toString()}`);
                  if (yieldValue > BigInt(0)) {
                    totalYield += yieldValue;
                  }
                } catch (error) {
                  // Property might not have yield yet, continue
                  this.logger.debug(`⚠️ Failed to get yield for property ${tokenId}: ${error.message}`);
                }
              }
              
              // If we found yield in YieldDistributor, use it AND update the database
              if (totalYield > BigInt(0)) {
                verifiedYield = totalYield.toString();
                this.logger.log(`✅ Verified yield for ${r.walletAddress}: ${verifiedYield} TYCOON (was ${dbYield} from DB)`);
                
                // Update the database so it persists - no need to verify again next time
                if (r.userId) {
                  try {
                    await this.db
                      .update(schema.leaderboard)
                      .set({
                        totalYieldEarned: verifiedYield,
                        updatedAt: new Date(),
                      })
                      .where(eq(schema.leaderboard.userId, r.userId));
                    this.logger.log(`💾 Updated database with verified yield for ${r.walletAddress}`);
                  } catch (dbError) {
                    this.logger.warn(`Failed to update database with verified yield: ${dbError.message}`);
                  }
                }
              } else {
                this.logger.log(`ℹ️ No yield found in YieldDistributor for ${r.walletAddress} (all properties have 0 yield)`);
              }
            } catch (error) {
              // If verification fails, use database value
              this.logger.warn(`❌ Failed to verify yield for ${r.walletAddress}: ${error.message}`);
            }
          }
          
          return {
            ...r,
            rank: index + 1,
            // Convert string values (NUMERIC) to strings for JSON serialization
            totalPortfolioValue: r.totalPortfolioValue ? String(r.totalPortfolioValue) : '0',
            totalYieldEarned: verifiedYield,
          };
        })
      );

      return rankingsWithVerifiedYield;
    } catch (error) {
      this.logger.warn(`Error fetching leaderboard from database: ${error.message}`);
    }

    // If database is empty or failed, calculate from blockchain directly
    this.logger.log('Database leaderboard empty or invalid, calculating from blockchain...');
    return await this.calculateLeaderboardFromBlockchain(limit);
  }
  

  async clearAndRecalculateLeaderboard(limit: number = 100) {
    this.logger.log('🗑️ Clearing all old leaderboard data and recalculating from new contract only...');
    
    // Step 1: Delete ALL leaderboard entries
    try {
      await this.db.delete(schema.leaderboard);
      this.logger.log('✅ Cleared all leaderboard entries');
    } catch (error: any) {
      this.logger.error(`Failed to clear leaderboard: ${error.message}`);
      throw error;
    }
    
    // Step 2: Recalculate from new contract only
    const rankings = await this.calculateLeaderboardFromBlockchain(limit);
    
    this.logger.log(`✅ Recalculated leaderboard with ${rankings.length} entries from new contract`);
    return rankings;
  }

  async calculateLeaderboardFromBlockchain(limit: number = 100) {
    if (!this.contractsService.propertyNFT) {
      this.logger.warn('PropertyNFT contract not initialized, cannot calculate leaderboard from blockchain');
      return [];
    }

    try {
      // Get the current PropertyNFT contract address to ensure we only query the new contract
      const propertyNFTAddress = this.contractsService.propertyNFT.address;
      const expectedPropertyNFT = process.env.PROPERTY_NFT_ADDRESS || '0xe1fF4f5f79D843208A0c70a0634a0CE4F034D697';
      this.logger.log(`Using PropertyNFT contract: ${propertyNFTAddress}`);
      this.logger.log(`Expected PropertyNFT: ${expectedPropertyNFT}`);
      
      // Verify we're using the correct PropertyNFT contract
      if (propertyNFTAddress.toLowerCase() !== expectedPropertyNFT.toLowerCase()) {
        this.logger.error(`PropertyNFT address mismatch! Using ${propertyNFTAddress}, expected ${expectedPropertyNFT}`);
        throw new Error('PropertyNFT address mismatch - using wrong contract');
      }
      
      // First, discover property owners from blockchain events (chunk queries to avoid RPC limit)
      const discoveredOwners = new Set<string>();
      try {
        this.logger.log('Discovering property owners from blockchain events (new contract only)...');
        const currentBlock = await this.contractsService.getProvider().getBlockNumber();
        
        // Query from block 0 to ensure we get all properties from the new contract
        // The PropertyNFT contract address filter ensures we only get events from the new contract
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
        this.logger.log(`Found ${discoveredOwners.size} unique property owners from new contract events`);
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
            let tokenIds: bigint[] = [];
            try {
              const result = await this.contractsService.getOwnerProperties(user.walletAddress);
              if (Array.isArray(result)) {
                tokenIds = result;
              } else if (result && typeof result === 'object' && 'length' in result) {
                tokenIds = Array.from(result as any);
              }
            } catch (error: any) {
              // If getOwnerProperties fails, user has no properties in new contract
              this.logger.debug(`No properties found in new contract for ${user.walletAddress}: ${error.message}`);
              return null; // No properties
            }
            
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
                
                // Try to get yield from YieldDistributor first (more accurate after claims)
                let propertyYield = BigInt(propData.totalYieldEarned?.toString() || '0');
                try {
                  if (this.contractsService.yieldDistributor) {
                    const yieldEarned = await this.contractsService.yieldDistributor.propertyTotalYieldEarned(BigInt(Number(tokenId)));
                    if (yieldEarned && yieldEarned.toString() !== '0') {
                      propertyYield = BigInt(yieldEarned.toString());
                    }
                  }
                } catch (error) {
                  // Fallback to PropertyNFT value if YieldDistributor call fails
                  this.logger.debug(`Failed to read yield from YieldDistributor for property ${tokenId}, using PropertyNFT value: ${error.message}`);
                }
                
                totalYieldEarned += propertyYield;
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

      // Save leaderboard entries to database
      for (const entry of validEntries) {
        try {
          await this.db
            .insert(schema.leaderboard)
            .values({
              userId: entry.userId,
              totalPortfolioValue: entry.totalPortfolioValue,
              totalYieldEarned: entry.totalYieldEarned,
              propertiesOwned: entry.propertiesOwned,
              questsCompleted: entry.questsCompleted || 0,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: schema.leaderboard.userId,
              set: {
                totalPortfolioValue: entry.totalPortfolioValue,
                totalYieldEarned: entry.totalYieldEarned,
                propertiesOwned: entry.propertiesOwned,
                questsCompleted: entry.questsCompleted || 0,
                updatedAt: new Date(),
              },
            });
        } catch (error: any) {
          this.logger.warn(`Failed to save leaderboard entry for ${entry.walletAddress}: ${error.message}`);
        }
      }
      
      this.logger.log(`Calculated and saved ${validEntries.length} leaderboard entries from blockchain`);
      
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

    // Get user's properties directly from blockchain (source of truth)
    // This ensures listed properties (owned by marketplace contract) are not counted
    let totalPortfolioValue = BigInt(0);
    let actualPropertyCount = 0;
    
    if (this.contractsService.propertyNFT) {
      try {
        // Get actual properties owned by user from blockchain
        let tokenIds: bigint[] = [];
        try {
          const result = await this.contractsService.getOwnerProperties(user.walletAddress);
          if (Array.isArray(result)) {
            tokenIds = result;
          } else if (result && typeof result === 'object' && 'length' in result) {
            tokenIds = Array.from(result as any);
          }
        } catch (error: any) {
          // If getOwnerProperties fails, user has no properties in new contract
          this.logger.warn(`No properties found in new contract for ${user.walletAddress}: ${error.message}`);
          // Don't update leaderboard if user has no properties
          return;
        }
        
        this.logger.log(`🔍 getOwnerProperties returned ${tokenIds.length} properties for ${user.walletAddress}`);
        const contractAddresses = this.getContractAddresses();
        
        if (Array.isArray(tokenIds) && tokenIds.length > 0) {
          // Deduplicate tokenIds
          const uniqueTokenIds = Array.from(new Set(tokenIds.map(id => Number(id))));
          
          // For each property, verify current owner FIRST (before getting property data)
          // This ensures listed properties (owned by marketplace) are excluded
          for (const tokenId of uniqueTokenIds) {
            try {
              // Check ownerOf FIRST - this is the source of truth
              let currentOwner: string;
              try {
                currentOwner = await this.contractsService.propertyNFT.ownerOf(tokenId);
              } catch (error) {
                // ownerOf failed - property doesn't exist in new contract (from old contract)
                this.logger.warn(`⚠️ Property ${tokenId} doesn't exist in new contract, skipping`);
                continue; // Skip this property
              }
              
              const isOwnedByUser = currentOwner.toLowerCase() === user.walletAddress.toLowerCase();
              const isContract = contractAddresses.includes(currentOwner.toLowerCase());
              
              this.logger.log(`🔍 Property ${tokenId}: ownerOf=${currentOwner}, user=${user.walletAddress}, isOwnedByUser=${isOwnedByUser}, isContract=${isContract}`);
              
              // Only process if owned by user AND not a contract address
              if (isOwnedByUser && !isContract) {
                const propertyData = await this.contractsService.getProperty(BigInt(tokenId));
                if (propertyData) {
                  const value = propertyData.value?.toString() || '0';
                  totalPortfolioValue += BigInt(value);
                  actualPropertyCount++;
                  this.logger.log(`✅ Property ${tokenId} counted: value=${value}`);
                }
              } else {
                this.logger.log(`❌ Property ${tokenId} excluded: owned by ${currentOwner} (${isContract ? 'contract' : 'different user'})`);
              }
            } catch (error: any) {
              // If ownerOf fails, property doesn't exist in new contract - skip it
              if (error.message?.includes('revert') || error.code === 'CALL_EXCEPTION') {
                this.logger.debug(`Property ${tokenId} doesn't exist in new contract, skipping`);
              } else {
                this.logger.warn(`Failed to verify property ${tokenId} for leaderboard: ${error.message}`);
              }
            }
          }
        }
        
        this.logger.log(`Calculated portfolio for ${user.walletAddress}: ${actualPropertyCount} properties, ${totalPortfolioValue.toString()} wei`);
      } catch (error) {
        this.logger.error(`Failed to get properties from blockchain for leaderboard: ${error.message}`);
        // Fallback to database if blockchain query fails
        const properties = await this.db
          .select()
          .from(schema.properties)
          .where(eq(schema.properties.ownerId, userId));
        totalPortfolioValue = properties.reduce((sum, prop) => {
          return sum + BigInt(prop.value?.toString() || '0');
        }, BigInt(0));
        actualPropertyCount = actualPropertyCount;
      }
    } else {
      // Fallback to database if contract not initialized
      const properties = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.ownerId, userId));
      totalPortfolioValue = properties.reduce((sum, prop) => {
        return sum + BigInt(prop.value?.toString() || '0');
      }, BigInt(0));
      actualPropertyCount = actualPropertyCount;
    }

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

    // Get total yield earned - check YieldDistributor first (source of truth after claims)
    let totalYieldEarned = BigInt(0);
    
    // Try to get total yield from YieldDistributor contract first
    try {
      if (this.contractsService.yieldDistributor) {
        // Get all properties owned by user
        let tokenIds: bigint[] = [];
        try {
          const result = await this.contractsService.getOwnerProperties(user.walletAddress);
          if (Array.isArray(result)) {
            tokenIds = result;
          } else if (result && typeof result === 'object' && 'length' in result) {
            tokenIds = Array.from(result as any);
          }
        } catch (error) {
          this.logger.debug(`No properties found for yield calculation: ${error.message}`);
        }
        
        // Sum yield from YieldDistributor for all properties
        for (const tokenId of tokenIds) {
          try {
            const yieldEarned = await this.contractsService.yieldDistributor.propertyTotalYieldEarned(BigInt(Number(tokenId)));
            const yieldValue = BigInt(yieldEarned.toString());
            if (yieldValue > BigInt(0)) {
              totalYieldEarned += yieldValue;
              this.logger.log(`Property ${tokenId}: yield from YieldDistributor = ${yieldValue.toString()}`);
            } else {
              this.logger.debug(`Property ${tokenId}: no yield in YieldDistributor (value is 0)`);
            }
          } catch (error) {
            // Property might not have yield yet, continue
            this.logger.debug(`No yield found in YieldDistributor for property ${tokenId}: ${error.message}`);
          }
        }
        
        this.logger.log(`Total yield from YieldDistributor for ${user.walletAddress}: ${totalYieldEarned.toString()}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to get yield from YieldDistributor, falling back to database: ${error.message}`);
    }
    
    // Fallback to database yield records if YieldDistributor doesn't have data
    // But only if YieldDistributor actually returned 0 (not if it failed)
    if (totalYieldEarned === BigInt(0)) {
      // Also check totalYieldClaimed from YieldDistributor as a backup
      try {
        if (this.contractsService.yieldDistributor) {
          const totalYieldClaimed = await this.contractsService.yieldDistributor.totalYieldClaimed(user.walletAddress);
          if (totalYieldClaimed && totalYieldClaimed.toString() !== '0') {
            totalYieldEarned = BigInt(totalYieldClaimed.toString());
            this.logger.log(`Total yield from totalYieldClaimed for ${user.walletAddress}: ${totalYieldEarned.toString()}`);
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to get totalYieldClaimed: ${error.message}`);
      }
      
      // If still 0, fallback to database yield records
      if (totalYieldEarned === BigInt(0)) {
        const yieldRecords = await this.db
          .select()
          .from(schema.yieldRecords)
          .where(
            and(
              eq(schema.yieldRecords.ownerId, userId),
              eq(schema.yieldRecords.claimed, true),
            ),
          );

        totalYieldEarned = yieldRecords.reduce((sum, record) => {
          return sum + BigInt(record.amount.toString());
        }, BigInt(0));
        
        this.logger.log(`Total yield from database records for ${user.walletAddress}: ${totalYieldEarned.toString()}`);
      }
    }

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
      propertiesOwned: actualPropertyCount,
      questsCompleted: completedQuests.length,
      updatedAt: new Date(),
    };

    try {
      if (existing) {
        await this.db
          .update(schema.leaderboard)
          .set(leaderboardData)
          .where(eq(schema.leaderboard.userId, userId));
        this.logger.log(`✅ Updated leaderboard for ${user.walletAddress}: yield=${totalYieldEarnedStr}, portfolio=${totalPortfolioValueStr}`);
      } else {
        await this.db.insert(schema.leaderboard).values(leaderboardData);
        this.logger.log(`✅ Created leaderboard entry for ${user.walletAddress}: yield=${totalYieldEarnedStr}, portfolio=${totalPortfolioValueStr}`);
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
    this.logger.log(`Updated leaderboard for user ${userId}: ${actualPropertyCount} properties, ${portfolioValueStr} TYCOON portfolio`);
    
    // Update users table with fresh blockchain stats (so updateUserLevel uses current data)
    try {
      await this.db
        .update(schema.users)
        .set({
          totalPortfolioValue: totalPortfolioValueStr,
          totalYieldEarned: totalYieldEarnedStr,
          propertiesOwned: actualPropertyCount,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
      this.logger.log(`✅ Updated users table with fresh blockchain stats for ${user.walletAddress}`);
    } catch (error: any) {
      this.logger.warn(`Failed to update users table: ${error.message}`);
    }
    
    // Update user level after leaderboard update (now uses fresh stats from users table)
    if (this.usersService) {
      try {
        await this.usersService.updateUserLevel(userId);
      } catch (error: any) {
        this.logger.warn(`Failed to update user level: ${error.message}`);
      }
    }
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

  async cleanupContractAddresses() {
    const contractAddresses = this.getContractAddresses();
    this.logger.log(`Cleaning up leaderboard entries for ${contractAddresses.length} contract addresses...`);
    
    let deletedCount = 0;
    
    for (const contractAddr of contractAddresses) {
      try {
        // Find users with this contract address
        const contractUsers = await this.db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.walletAddress, contractAddr));
        
        for (const user of contractUsers) {
          // Delete leaderboard entries
          await this.db
            .delete(schema.leaderboard)
            .where(eq(schema.leaderboard.userId, user.id));
          
          deletedCount++;
          this.logger.log(`Deleted leaderboard entry for contract ${contractAddr}`);
        }
      } catch (error: any) {
        this.logger.error(`Error cleaning up contract ${contractAddr}: ${error.message}`);
      }
    }
    
    this.logger.log(`Cleanup complete: Deleted ${deletedCount} leaderboard entries for contract addresses`);
    return { 
      success: true, 
      deletedCount,
      contractAddresses: contractAddresses.length,
      message: `Cleaned up ${deletedCount} leaderboard entries for contract addresses` 
    };
  }
}
