import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { desc, sql, eq, and } from 'drizzle-orm';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>) {}

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
      return;
    }

    // Get user's properties
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

    this.logger.log(`Updated leaderboard for user ${userId}`);
  }
}
