import { pgTable, uuid, varchar, timestamp, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  totalPortfolioValue: bigint('total_portfolio_value', { mode: 'bigint' }).default('0').notNull(),
  totalYieldEarned: bigint('total_yield_earned', { mode: 'bigint' }).default('0').notNull(),
  propertiesOwned: bigint('properties_owned', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

