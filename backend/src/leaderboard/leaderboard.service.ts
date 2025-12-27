import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { desc, sql, eq, and } from 'drizzle-orm';
import { PropertiesService } from '../properties/properties.service';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    @Inject(forwardRef(() => PropertiesService)) private propertiesService: PropertiesService,
    private contractsService: ContractsService,
  ) {}

  async getGlobalLeaderboard(limit: number = 100) {
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
    try {
      this.logger.log(`Syncing properties from blockchain for user ${user.walletAddress} before leaderboard update`);
      await this.propertiesService.syncFromChain(user.walletAddress);
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

  async syncAndUpdateLeaderboard(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Find or create user
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, normalizedAddress))
      .limit(1);

    if (!user) {
      // Try to sync properties first, which will create the user
      try {
        await this.propertiesService.syncFromChain(walletAddress);
        [user] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.walletAddress, normalizedAddress))
          .limit(1);
      } catch (error) {
        this.logger.error(`Failed to sync user ${walletAddress}: ${error.message}`);
        throw error;
      }
    }

    if (!user) {
      throw new Error(`User not found and could not be created for ${walletAddress}`);
    }

    // Sync properties and update leaderboard
    await this.updateLeaderboard(user.id);
  }
}
