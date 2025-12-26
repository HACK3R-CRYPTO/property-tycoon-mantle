import { pgTable, uuid, bigint, timestamp, boolean, varchar, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const quests = pgTable('quests', {
  id: uuid('id').defaultRandom().primaryKey(),
  questId: bigint('quest_id', { mode: 'number' }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  rewardAmount: bigint('reward_amount', { mode: 'bigint' }).notNull(),
  requiredProperties: integer('required_properties').notNull(),
  requiredPropertyType: varchar('required_property_type', { length: 50 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questProgress = pgTable('quest_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  questId: uuid('quest_id')
    .notNull()
    .references(() => quests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  completed: boolean('completed').default(false).notNull(),
  progress: integer('progress').default(0).notNull(),
  rewardClaimed: boolean('reward_claimed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Quest = typeof quests.$inferSelect;
export type NewQuest = typeof quests.$inferInsert;
export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;

