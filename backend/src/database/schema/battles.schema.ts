import { pgTable, uuid, integer, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { villages } from './villages.schema';

/**
 * Battles table - stores battle history and results
 * Each record represents a single attack (either PvE or PvP)
 */
export const battles = pgTable('battles', {
  id: uuid('id').defaultRandom().primaryKey(),
  attackerId: uuid('attacker_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' }),
  defenderId: uuid('defender_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' }),
  // Troops used by attacker (array of {type: string, count: number})
  attackerTroops: jsonb('attacker_troops').notNull(),
  // Battle result
  destructionPercentage: integer('destruction_percentage').default(0).notNull(), // 0-100
  stars: integer('stars').default(0).notNull(), // 0-3 stars
  // Resources looted
  lootGold: integer('loot_gold').default(0).notNull(),
  lootElixir: integer('loot_elixir').default(0).notNull(),
  // Battle replay data (optional) - stores events for playback
  // Format: [{timestamp: number, type: string, data: any}]
  battleLog: jsonb('battle_log'),
  // Status for tracking
  status: varchar('status', { length: 20 }).default('completed').notNull(), // completed, in_progress
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;
