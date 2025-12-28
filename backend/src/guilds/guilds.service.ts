import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(@Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>) {}

  async createGuild(ownerId: string, name: string, description?: string, isPublic: boolean = true) {
    // Check if user already has a guild
    const existingGuild = await this.db
      .select()
      .from(schema.guildMembers)
      .where(eq(schema.guildMembers.userId, ownerId))
      .limit(1);

    if (existingGuild.length > 0) {
      throw new BadRequestException('User is already a member of a guild');
    }

    // Check if guild name exists
    const [existingName] = await this.db
      .select()
      .from(schema.guilds)
      .where(eq(schema.guilds.name, name))
      .limit(1);

    if (existingName) {
      throw new BadRequestException('Guild name already exists');
    }

    // Create guild
    const [guild] = await this.db
      .insert(schema.guilds)
      .values({
        name,
        description,
        ownerId,
        isPublic,
        totalMembers: 1,
      })
      .returning();

    // Add owner as member
    await this.db.insert(schema.guildMembers).values({
      guildId: guild.id,
      userId: ownerId,
      role: 'owner',
    });

    this.logger.log(`Guild created: ${name} by user ${ownerId}`);
    return guild;
  }

  async createGuildByWallet(walletAddress: string, name: string, description?: string, isPublic: boolean = true) {
    // Get or create user by wallet address
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      // Auto-create user if they don't exist
      this.logger.log(`User not found for wallet ${walletAddress}, creating new user...`);
      [user] = await this.db
        .insert(schema.users)
        .values({
          walletAddress: walletAddress,
          totalPortfolioValue: '0',
          totalYieldEarned: '0',
          propertiesOwned: 0,
        })
        .returning();
      this.logger.log(`Created new user ${user.id} for wallet ${walletAddress}`);
    }

    return this.createGuild(user.id, name, description, isPublic);
  }

  async joinGuild(userId: string, guildId: string) {
    // Check if user is already in a guild
    const existingMembership = await this.db
      .select()
      .from(schema.guildMembers)
      .where(eq(schema.guildMembers.userId, userId))
      .limit(1);

    if (existingMembership.length > 0) {
      throw new BadRequestException('User is already a member of a guild');
    }

    // Check if guild exists
    const [guild] = await this.db
      .select()
      .from(schema.guilds)
      .where(eq(schema.guilds.id, guildId))
      .limit(1);

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    if (!guild.isPublic) {
      throw new BadRequestException('Guild is private');
    }

    // Add member
    await this.db.insert(schema.guildMembers).values({
      guildId,
      userId,
      role: 'member',
    });

    // Update guild member count
    await this.db
      .update(schema.guilds)
      .set({ totalMembers: guild.totalMembers + 1 })
      .where(eq(schema.guilds.id, guildId));

    this.logger.log(`User ${userId} joined guild ${guildId}`);
    return { success: true };
  }

  async joinGuildByWallet(walletAddress: string, guildId: string) {
    // Get or create user by wallet address
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      // Auto-create user if they don't exist
      this.logger.log(`User not found for wallet ${walletAddress}, creating new user...`);
      [user] = await this.db
        .insert(schema.users)
        .values({
          walletAddress: walletAddress,
          totalPortfolioValue: '0',
          totalYieldEarned: '0',
          propertiesOwned: 0,
        })
        .returning();
      this.logger.log(`Created new user ${user.id} for wallet ${walletAddress}`);
    }

    return this.joinGuild(user.id, guildId);
  }

  async leaveGuild(userId: string, guildId: string) {
    const [membership] = await this.db
      .select()
      .from(schema.guildMembers)
      .where(and(eq(schema.guildMembers.userId, userId), eq(schema.guildMembers.guildId, guildId)))
      .limit(1);

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If owner, transfer ownership or delete guild
    const [guild] = await this.db
      .select()
      .from(schema.guilds)
      .where(eq(schema.guilds.id, guildId))
      .limit(1);

    if (guild.ownerId === userId) {
      // Transfer to first admin or delete if no members
      const [nextOwner] = await this.db
        .select()
        .from(schema.guildMembers)
        .where(and(eq(schema.guildMembers.guildId, guildId), eq(schema.guildMembers.userId, userId)))
        .limit(1);

      if (nextOwner) {
        await this.db
          .update(schema.guilds)
          .set({ ownerId: nextOwner.userId })
          .where(eq(schema.guilds.id, guildId));
        await this.db
          .update(schema.guildMembers)
          .set({ role: 'owner' })
          .where(eq(schema.guildMembers.id, nextOwner.id));
      } else {
        // Delete guild if no members left
        await this.db.delete(schema.guilds).where(eq(schema.guilds.id, guildId));
      }
    }

    // Remove member
    await this.db
      .delete(schema.guildMembers)
      .where(and(eq(schema.guildMembers.userId, userId), eq(schema.guildMembers.guildId, guildId)));

    // Update member count (reuse guild variable from above)
    if (guild && guild.totalMembers > 0) {
      await this.db
        .update(schema.guilds)
        .set({ totalMembers: guild.totalMembers - 1 })
        .where(eq(schema.guilds.id, guildId));
    }

    this.logger.log(`User ${userId} left guild ${guildId}`);
    return { success: true };
  }

  async getGuild(guildId: string) {
    const [guild] = await this.db
      .select({
        id: schema.guilds.id,
        name: schema.guilds.name,
        description: schema.guilds.description,
        ownerId: schema.guilds.ownerId,
        totalMembers: schema.guilds.totalMembers,
        totalPortfolioValue: schema.guilds.totalPortfolioValue,
        totalYieldEarned: schema.guilds.totalYieldEarned,
        isPublic: schema.guilds.isPublic,
        createdAt: schema.guilds.createdAt,
        owner: {
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
      })
      .from(schema.guilds)
      .leftJoin(schema.users, eq(schema.guilds.ownerId, schema.users.id))
      .where(eq(schema.guilds.id, guildId))
      .limit(1);

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    // Get members
    const members = await this.db
      .select({
        id: schema.guildMembers.id,
        userId: schema.guildMembers.userId,
        role: schema.guildMembers.role,
        contribution: schema.guildMembers.contribution,
        joinedAt: schema.guildMembers.joinedAt,
        user: {
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
      })
      .from(schema.guildMembers)
      .leftJoin(schema.users, eq(schema.guildMembers.userId, schema.users.id))
      .where(eq(schema.guildMembers.guildId, guildId));

    return { ...guild, members };
  }

  async getUserGuild(userId: string) {
    const [membership] = await this.db
      .select()
      .from(schema.guildMembers)
      .where(eq(schema.guildMembers.userId, userId))
      .limit(1);

    if (!membership) {
      return null;
    }

    return this.getGuild(membership.guildId);
  }

  async getUserGuildByWallet(walletAddress: string) {
    // Get user by wallet address (don't auto-create for read operations)
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      return null; // User doesn't exist, so no guild
    }

    return this.getUserGuild(user.id);
  }

  async getGuildLeaderboard(limit: number = 20) {
    const rankings = await this.db
      .select({
        id: schema.guilds.id,
        name: schema.guilds.name,
        totalMembers: schema.guilds.totalMembers,
        totalPortfolioValue: schema.guilds.totalPortfolioValue,
        totalYieldEarned: schema.guilds.totalYieldEarned,
        owner: {
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
      })
      .from(schema.guilds)
      .leftJoin(schema.users, eq(schema.guilds.ownerId, schema.users.id))
      .orderBy(desc(schema.guilds.totalPortfolioValue))
      .limit(limit);

    return rankings.map((r, index) => ({
      ...r,
      rank: index + 1,
    }));
  }

  async updateGuildStats(guildId: string) {
    // Get all members
    const members = await this.db
      .select({ userId: schema.guildMembers.userId })
      .from(schema.guildMembers)
      .where(eq(schema.guildMembers.guildId, guildId));

    // Calculate total portfolio value and yield from all members
    let totalPortfolioValue = BigInt(0);
    let totalYieldEarned = BigInt(0);

    for (const member of members) {
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, member.userId))
        .limit(1);

      if (user) {
        // User values are stored as NUMERIC (string), convert to BigInt for calculation
        const portfolioValueStr = user.totalPortfolioValue ? String(user.totalPortfolioValue) : '0';
        const yieldEarnedStr = user.totalYieldEarned ? String(user.totalYieldEarned) : '0';
        totalPortfolioValue += BigInt(portfolioValueStr);
        totalYieldEarned += BigInt(yieldEarnedStr);
      }
    }

    // Update guild stats - convert BigInt to string for NUMERIC columns
    await this.db
      .update(schema.guilds)
      .set({
        totalPortfolioValue: totalPortfolioValue.toString(), // String for NUMERIC column
        totalYieldEarned: totalYieldEarned.toString(), // String for NUMERIC column
        updatedAt: new Date(),
      })
      .where(eq(schema.guilds.id, guildId));

    this.logger.log(`Updated stats for guild ${guildId}`);
  }

  async searchGuilds(query: string, limit: number = 20) {
    return this.db
      .select({
        id: schema.guilds.id,
        name: schema.guilds.name,
        description: schema.guilds.description,
        totalMembers: schema.guilds.totalMembers,
        totalPortfolioValue: schema.guilds.totalPortfolioValue,
        isPublic: schema.guilds.isPublic,
      })
      .from(schema.guilds)
      .where(
        and(
          eq(schema.guilds.isPublic, true),
          sql`LOWER(${schema.guilds.name}) LIKE LOWER(${'%' + query + '%'})`,
        ),
      )
      .orderBy(desc(schema.guilds.totalPortfolioValue))
      .limit(limit);
  }
}
