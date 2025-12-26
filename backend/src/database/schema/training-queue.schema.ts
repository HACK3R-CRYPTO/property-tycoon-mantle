import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { villages } from './villages.schema';

/**
 * Training Queue table - stores ongoing troop training
 * Each record represents a single troop being trained
 */
export const trainingQueue = pgTable('training_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  villageId: uuid('village_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' }),
  troopType: varchar('troop_type', { length: 50 }).notNull(), // BARBARIAN, ARCHER, etc.
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completesAt: timestamp('completes_at').notNull(), // when training finishes
  cost: integer('cost').notNull(), // elixir cost paid for this training
  queuePosition: integer('queue_position').notNull(), // order in the queue (0 = first)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TrainingQueue = typeof trainingQueue.$inferSelect;
export type NewTrainingQueue = typeof trainingQueue.$inferInsert;
