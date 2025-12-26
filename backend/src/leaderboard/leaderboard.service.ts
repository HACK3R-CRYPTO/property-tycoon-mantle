import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { desc, sql, eq } from 'drizzle-orm';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>) {}

  async getGlobalLeaderboard(limit: number = 100) {
    const rankings = await this.db
      .select({
        userId: schema.leaderboard.userId,
        rank: schema.leaderboard.rank,
        totalPortfolioValue: schema.leaderboard.totalPortfolioValue,
        totalYieldEarned: schema.leaderboard.totalYieldEarned,
        propertiesOwned: schema.leaderboard.propertiesOwned,
        questsCompleted: schema.leaderboard.questsCompleted,
        user: {
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
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

    const properties = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.ownerId, userId));

    const questsCompleted = await this.db
      .select()
      .from(schema.questProgress)
      .where(eq(schema.questProgress.userId, userId))
      .where(eq(schema.questProgress.completed, true));

    const totalYieldEarned = await this.db
      .select({
        total: sql<bigint>`sum(${schema.yieldRecords.amount})`,
      })
      .from(schema.yieldRecords)
      .where(eq(schema.yieldRecords.ownerId, userId))
      .where(eq(schema.yieldRecords.claimed, true));

    const [existing] = await this.db
      .select()
      .from(schema.leaderboard)
      .where(eq(schema.leaderboard.userId, userId))
      .limit(1);

    const leaderboardData = {
      userId,
      totalPortfolioValue: user.totalPortfolioValue,
      totalYieldEarned: totalYieldEarned[0]?.total || BigInt(0),
      propertiesOwned: properties.length,
      questsCompleted: questsCompleted.length,
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
  }
}
