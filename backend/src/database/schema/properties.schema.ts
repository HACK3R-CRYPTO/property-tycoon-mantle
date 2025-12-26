import { pgTable, uuid, varchar, bigint, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenId: bigint('token_id', { mode: 'number' }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  propertyType: varchar('property_type', { length: 50 }).notNull(), // Residential, Commercial, Industrial, Luxury
  value: bigint('value', { mode: 'bigint' }).notNull(),
  yieldRate: integer('yield_rate').notNull(), // Basis points (e.g., 500 = 5%)
  rwaContract: varchar('rwa_contract', { length: 42 }),
  rwaTokenId: bigint('rwa_token_id', { mode: 'number' }),
  totalYieldEarned: bigint('total_yield_earned', { mode: 'bigint' }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

