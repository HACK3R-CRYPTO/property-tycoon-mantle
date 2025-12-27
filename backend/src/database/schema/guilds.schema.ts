import { pgTable, uuid, varchar, text, integer, bigint, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const guilds = pgTable('guilds', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalMembers: integer('total_members').default(1).notNull(),
  totalPortfolioValue: bigint('total_portfolio_value', { mode: 'bigint' }).default(BigInt(0)).notNull(),
  totalYieldEarned: bigint('total_yield_earned', { mode: 'bigint' }).default(BigInt(0)).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const guildMembers = pgTable('guild_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  guildId: uuid('guild_id')
    .notNull()
    .references(() => guilds.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).default('member').notNull(), // owner, admin, member
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  contribution: bigint('contribution', { mode: 'bigint' }).default(BigInt(0)).notNull(), // Portfolio value contributed
});

export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;
export type GuildMember = typeof guildMembers.$inferSelect;
export type NewGuildMember = typeof guildMembers.$inferInsert;

