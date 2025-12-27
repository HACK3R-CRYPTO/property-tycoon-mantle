import { pgTable, uuid, varchar, timestamp, bigint, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  totalPortfolioValue: numeric('total_portfolio_value').default('0').notNull(),
  totalYieldEarned: numeric('total_yield_earned').default('0').notNull(),
  propertiesOwned: bigint('properties_owned', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

