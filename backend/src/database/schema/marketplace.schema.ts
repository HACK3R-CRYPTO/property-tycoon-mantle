import { pgTable, uuid, varchar, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { properties } from './properties.schema';

export const marketplaceListings = pgTable('marketplace_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' })
    .unique(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  price: numeric('price').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  listingType: varchar('listing_type', { length: 20 }).notNull(),
  auctionEndTime: timestamp('auction_end_time'),
  highestBid: numeric('highest_bid'),
  highestBidderId: uuid('highest_bidder_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type NewMarketplaceListing = typeof marketplaceListings.$inferInsert;

