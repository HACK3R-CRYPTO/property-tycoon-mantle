import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { villages } from './villages.schema';

export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  villageId: uuid('village_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' })
    .unique(),
  gold: integer('gold').default(500).notNull(),
  elixir: integer('elixir').default(500).notNull(),
  lastCollectedAt: timestamp('last_collected_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
