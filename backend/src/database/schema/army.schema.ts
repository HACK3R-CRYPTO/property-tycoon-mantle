import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { villages } from './villages.schema';

/**
 * Army table - stores the user's trained troops
 * Each record represents a count of specific troop type for a village
 */
export const army = pgTable('army', {
  id: uuid('id').defaultRandom().primaryKey(),
  villageId: uuid('village_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' }),
  troopType: varchar('troop_type', { length: 50 }).notNull(), // BARBARIAN, ARCHER, etc.
  count: integer('count').default(0).notNull(), // number of troops of this type
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Army = typeof army.$inferSelect;
export type NewArmy = typeof army.$inferInsert;
