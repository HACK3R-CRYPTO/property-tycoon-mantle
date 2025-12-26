import { pgTable, uuid, bigint, timestamp, varchar } from 'drizzle-orm/pg-core';
import { properties } from './properties.schema';
import { users } from './users.schema';

export const yieldRecords = pgTable('yield_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  claimed: boolean('claimed').default(false).notNull(),
  transactionHash: varchar('transaction_hash', { length: 66 }),
  claimedAt: timestamp('claimed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type YieldRecord = typeof yieldRecords.$inferSelect;
export type NewYieldRecord = typeof yieldRecords.$inferInsert;

