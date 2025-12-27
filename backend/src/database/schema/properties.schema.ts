import { pgTable, uuid, varchar, bigint, integer, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenId: bigint('token_id', { mode: 'number' }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  propertyType: varchar('property_type', { length: 50 }).notNull(), // Residential, Commercial, Industrial, Luxury
  value: numeric('value').notNull(), // Use numeric to handle very large values (e.g., 100 * 10^18)
  yieldRate: integer('yield_rate').notNull(), // Basis points (e.g., 500 = 5%)
  rwaContract: varchar('rwa_contract', { length: 42 }),
  rwaTokenId: bigint('rwa_token_id', { mode: 'number' }),
  totalYieldEarned: bigint('total_yield_earned', { mode: 'bigint' }).default(BigInt(0)).notNull(),
  x: integer('x'), // X coordinate on the map
  y: integer('y'), // Y coordinate on the map
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

