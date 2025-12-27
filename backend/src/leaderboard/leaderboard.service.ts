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

  async getGlobalLeaderboard(limit: number = 100) {
    // Try to sync properties, but don't fail if sync doesn't work
    // This ensures leaderboard still loads even if blockchain calls fail
    try {
      // Check if contract is initialized
      if (this.contractsService.propertyNFT) {
        this.logger.log('Syncing users\' properties from blockchain before fetching leaderboard...');
        
        // Get all users (limit to avoid timeout)
        const allUsers = await this.db
          .select({
            id: schema.users.id,
            walletAddress: schema.users.walletAddress,
          })
          .from(schema.users)
          .limit(20); // Limit to first 20 users to avoid timeout

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
      } else {
        this.logger.warn('PropertyNFT contract not initialized, skipping sync');
      }
    } catch (error) {
      this.logger.error(`Error syncing properties before leaderboard fetch: ${error.message}`, error.stack);
      // Continue to return leaderboard even if sync fails
    }

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
      this.logger.warn('PropertyNFT contract not initialized, skipping sync');
      return;
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
          
          const existing = await this.db
            .select()
            .from(schema.properties)
            .where(eq(schema.properties.tokenId, tokenIdNum))
            .limit(1);

          if (existing.length === 0) {
            const propertyTypeNum = typeof propData.propertyType === 'bigint' 
              ? Number(propData.propertyType) 
              : Number(propData.propertyType);
            
            const propertyTypeMap: Record<number, string> = {
              0: 'Residential',
              1: 'Commercial',
              2: 'Industrial',
              3: 'Luxury',
            };

            await this.db.insert(schema.properties).values({
              tokenId: tokenIdNum,
              ownerId: user.id,
              propertyType: propertyTypeMap[propertyTypeNum] || 'Residential',
              value: BigInt(propData.value.toString()),
              yieldRate: Number(propData.yieldRate.toString()),
              rwaContract: propData.rwaContract !== '0x0000000000000000000000000000000000000000' 
                ? propData.rwaContract 
                : undefined,
              rwaTokenId: propData.rwaTokenId ? Number(propData.rwaTokenId.toString()) : undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            
            this.logger.log(`Synced property ${tokenIdNum} for ${normalizedAddress}`);
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
