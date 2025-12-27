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
    // Check if contract is initialized
    if (!this.contractsService.propertyNFT) {
      this.logger.warn('PropertyNFT contract not initialized, cannot sync');
      return;
    }

    this.logger.log('Syncing all users\' properties from blockchain...');
    
    try {
      // Get all users (limit to avoid timeout)
      const allUsers = await this.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
        })
        .from(schema.users)
        .limit(50); // Limit to first 50 users to avoid timeout

      this.logger.log(`Found ${allUsers.length} users to sync`);

      // Sync properties for each user
      for (const user of allUsers) {
        try {
          await this.syncUserPropertiesFromChain(user.walletAddress);
          // Update leaderboard for this user
          await this.updateLeaderboard(user.id);
        } catch (error) {
          this.logger.error(`Failed to sync properties for user ${user.walletAddress}: ${error.message}`);
          // Continue with other users even if one fails
        }
      }
      
      this.logger.log(`Synced properties for ${allUsers.length} users`);
    } catch (error) {
      this.logger.error(`Error syncing users from chain: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getGlobalLeaderboard(limit: number = 100) {
    // Note: Sync should be called before this method via syncAllUsersFromChain()
    // This method just fetches and returns the leaderboard data

    // Now fetch the updated leaderboard (always return, even if sync failed)
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
        .limit(limit);

      return rankings.map((r, index) => ({
        ...r,
        rank: index + 1,
        // Convert BigInt values to strings for JSON serialization
        totalPortfolioValue: r.totalPortfolioValue ? r.totalPortfolioValue.toString() : '0',
        totalYieldEarned: r.totalYieldEarned ? r.totalYieldEarned.toString() : '0',
      }));
    } catch (error) {
      this.logger.error(`Error fetching leaderboard: ${error.message}`, error.stack);
      // Return empty array if query fails
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

    // Sync properties from blockchain first to ensure we have all properties
    // We'll sync directly here to avoid circular dependency
    try {
      this.logger.log(`Syncing properties from blockchain for user ${user.walletAddress} before leaderboard update`);
      await this.syncUserPropertiesFromChain(user.walletAddress);
    } catch (error) {
      this.logger.error(`Failed to sync properties for leaderboard update: ${error.message}`, error.stack);
      // Continue with database properties even if sync fails
    }

    // Get user's properties (now synced from blockchain)
    const properties = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.ownerId, userId));

    // Calculate total portfolio value
    const totalPortfolioValue = properties.reduce((sum, prop) => {
      return sum + BigInt(prop.value || '0');
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

    const leaderboardData = {
      userId,
      totalPortfolioValue: totalPortfolioValue,
      totalYieldEarned: totalYieldEarned,
      propertiesOwned: properties.length,
      questsCompleted: completedQuests.length,
      updatedAt: new Date(),
    };

    if (existing) {
      await this.db
        .update(schema.leaderboard)
        .set(leaderboardData)
        .where(eq(schema.leaderboard.userId, userId));
    } else {
      await this.db.insert(schema.leaderboard).values(leaderboardData);
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

          // Handle rwaTokenId - don't insert if it's 0
          const rwaTokenIdValue = propData.rwaTokenId 
            ? Number(propData.rwaTokenId.toString()) 
            : undefined;
          
          // Use upsert (ON CONFLICT) to handle duplicates gracefully
          try {
            await this.db
              .insert(schema.properties)
              .values({
                tokenId: tokenIdNum,
                ownerId: user.id,
                propertyType: propertyTypeMap[propertyTypeNum] || 'Residential',
                value: BigInt(propData.value.toString()),
                yieldRate: yieldRateValue,
                rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' 
                  ? propData.rwaContract 
                  : undefined,
                rwaTokenId: rwaTokenIdValue && rwaTokenIdValue > 0 ? rwaTokenIdValue : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: schema.properties.tokenId,
                set: {
                  ownerId: user.id, // Update owner in case of transfer
                  propertyType: propertyTypeMap[propertyTypeNum] || 'Residential',
                  value: BigInt(propData.value.toString()),
                  yieldRate: yieldRateValue,
                  rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' 
                    ? propData.rwaContract 
                    : undefined,
                  rwaTokenId: rwaTokenIdValue && rwaTokenIdValue > 0 ? rwaTokenIdValue : undefined,
                  updatedAt: new Date(),
                },
              });
            
            this.logger.log(`Synced property ${tokenIdNum} for ${normalizedAddress}`);
          } catch (dbError: any) {
            this.logger.error(`Database error inserting/updating property ${tokenIdNum}: ${dbError.message}`, dbError.stack);
            // Continue with next property even if this one fails
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
    
    // Sync properties from chain first
    await this.syncUserPropertiesFromChain(walletAddress);
    
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
