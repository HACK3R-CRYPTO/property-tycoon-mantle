import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

export interface UserProfileDto {
  id: string;
  walletAddress: string;
  username?: string;
  avatar: string;
  totalPortfolioValue: string;
  totalYieldEarned: string;
  propertiesOwned: number;
  totalExperiencePoints?: string;
  level?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getProfile(walletAddress: string): Promise<UserProfileDto | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return null;
    }

    // Generate avatar URL using dicebear (using wallet address as seed)
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.walletAddress}`;

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username || undefined,
      avatar: avatarUrl,
      totalPortfolioValue: user.totalPortfolioValue?.toString() || '0',
      totalYieldEarned: user.totalYieldEarned?.toString() || '0',
      propertiesOwned: user.propertiesOwned || 0,
      totalExperiencePoints: user.totalExperiencePoints?.toString() || '0',
      level: user.level || 1,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUsername(walletAddress: string, username: string): Promise<UserProfileDto> {
    // Validate username
    if (!username || username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }

    if (username.length > 100) {
      throw new Error('Username must be 100 characters or less');
    }

    // Check if username is already taken
    const [existingUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username.trim()))
      .limit(1);

    if (existingUser && existingUser.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Username is already taken');
    }

    // Get or create user
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      // Create new user
      [user] = await this.db
        .insert(schema.users)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          username: username.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    } else {
      // Update existing user
      [user] = await this.db
        .update(schema.users)
        .set({
          username: username.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
        .returning();
    }

    // Generate avatar URL
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.walletAddress}`;

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username || undefined,
      avatar: avatarUrl,
      totalPortfolioValue: user.totalPortfolioValue?.toString() || '0',
      totalYieldEarned: user.totalYieldEarned?.toString() || '0',
      propertiesOwned: user.propertiesOwned || 0,
      totalExperiencePoints: user.totalExperiencePoints?.toString() || '0',
      level: user.level || 1,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  
  /**
   * Calculate experience points from user stats
   * XP = (properties * 100) + (yieldEarned / 1e16) + (portfolioValue / 1e17)
   */
  private calculateExperiencePoints(
    propertiesCount: number,
    totalYieldEarned: bigint,
    totalPortfolioValue: bigint,
  ): number {
    const propertiesXP = propertiesCount * 100;
    const yieldXP = Number(totalYieldEarned) / 1e16; // 1 XP per 0.01 TYC
    const portfolioXP = Number(totalPortfolioValue) / 1e17; // 1 XP per 0.1 TYC
    return propertiesXP + yieldXP + portfolioXP;
  }

  /**
   * Calculate level from total experience points
   * Level = floor(sqrt(totalXP / 1000)) + 1
   */
  private calculateLevel(totalXP: number): number {
    return Math.max(1, Math.floor(Math.sqrt(totalXP / 1000)) + 1);
  }

  /**
   * Update user level and experience points based on current stats
   */
  async updateUserLevel(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      this.logger.warn(`User ${userId} not found for level update`);
      return;
    }

    const totalPortfolioValue = BigInt(user.totalPortfolioValue?.toString() || '0');
    const totalYieldEarned = BigInt(user.totalYieldEarned?.toString() || '0');
    const propertiesCount = user.propertiesOwned || 0;

    const totalXP = this.calculateExperiencePoints(propertiesCount, totalYieldEarned, totalPortfolioValue);
    const level = this.calculateLevel(totalXP);

    await this.db
      .update(schema.users)
      .set({
        totalExperiencePoints: totalXP.toString(),
        level: level,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    this.logger.log(`Updated level for user ${user.walletAddress}: Level ${level}, XP ${totalXP.toFixed(2)}`);
  }
}






