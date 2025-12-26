import { pgTable, uuid, bigint, timestamp, integer, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const leaderboard = pgTable('leaderboard', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  rank: integer('rank'),
  totalPortfolioValue: bigint('total_portfolio_value', { mode: 'bigint' }).default('0').notNull(),
  totalYieldEarned: bigint('total_yield_earned', { mode: 'bigint' }).default('0').notNull(),
  propertiesOwned: integer('properties_owned').default(0).notNull(),
  questsCompleted: integer('quests_completed').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboard.$inferInsert;

