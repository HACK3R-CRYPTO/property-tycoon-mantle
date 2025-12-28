import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ContractsService } from '../contracts/contracts.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MantleApiService } from '../mantle/mantle-api.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { GuildsService } from '../guilds/guilds.service';
import { PropertiesService } from '../properties/properties.service';
import { YieldService } from '../yield/yield.service';

@Injectable()
export class EventIndexerService implements OnModuleInit {
  private readonly logger = new Logger(EventIndexerService.name);
  private isIndexing = false;
  private lastProcessedBlock: number = 0;
  private readonly BLOCK_CONFIRMATIONS = 1; // Mantle has fast finality

  constructor(
    private configService: ConfigService,
    private contractsService: ContractsService,
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private websocketGateway: WebsocketGateway,
    private mantleApiService: MantleApiService,
    private leaderboardService: LeaderboardService,
    private guildsService: GuildsService,
    @Inject(forwardRef(() => PropertiesService)) private propertiesService: PropertiesService,
    @Inject(forwardRef(() => YieldService)) private yieldService: YieldService,
  ) {}

  async onModuleInit() {
    if (!this.contractsService.propertyNFT) {
      this.logger.warn('Contracts not initialized. Skipping event indexer setup.');
      return;
    }

    // Get last processed block from database or start from current block
    await this.initializeLastProcessedBlock();
    
    // Start listening to events
    this.startEventListeners();
    
    // Start periodic sync for missed events
    this.startPeriodicSync();
    
    // Optionally sync all existing properties on startup
    // This ensures properties created before backend was running are in database
    if (process.env.SYNC_EXISTING_ON_STARTUP === 'true' && process.env.ENABLE_PROPERTY_SYNC !== 'false') {
      this.logger.log('🔄 SYNC_EXISTING_ON_STARTUP=true - syncing all existing properties...');
      // Run in background to not block startup
      setTimeout(async () => {
        try {
          await this.propertiesService.syncAllExistingPropertiesFromChain();
          this.logger.log('✅ Auto-sync of existing properties completed');
        } catch (error) {
          this.logger.warn('Could not auto-sync existing properties on startup:', error.message);
        }
      }, 5000); // Wait 5 seconds after startup
    } else {
      this.logger.log('💡 To sync existing properties, call POST /properties/sync-all or set SYNC_EXISTING_ON_STARTUP=true');
    }
    
    this.logger.log('Event Indexer Service initialized');
  }

  private async initializeLastProcessedBlock() {
    try {
      // In production, store this in a database table
      // For now, start from current block minus some blocks for safety
      const currentBlock = await this.contractsService.getProvider().getBlockNumber();
      this.lastProcessedBlock = Math.max(0, currentBlock - 1000); // Start 1000 blocks back
      this.logger.log(`Starting event indexing from block ${this.lastProcessedBlock}`);
    } catch (error) {
      this.logger.error('Failed to initialize last processed block', error);
      this.lastProcessedBlock = 0;
    }
  }

  private startEventListeners() {
    // Listen to PropertyNFT events
    this.listenToPropertyNFTEvents();
    
    // Listen to YieldDistributor events
    this.listenToYieldDistributorEvents();
    
    // Listen to Marketplace events
    this.listenToMarketplaceEvents();
    
    // Listen to QuestSystem events
    this.listenToQuestSystemEvents();
  }

  private listenToPropertyNFTEvents() {
    const contract = this.contractsService.propertyNFT;
    if (!contract) return;

    // PropertyCreated event
    contract.on('PropertyCreated', async (tokenId, owner, propertyType, value, event) => {
      try {
        this.logger.log(`PropertyCreated: tokenId=${tokenId}, owner=${owner}`);
        await this.handlePropertyCreated(
          tokenId.toString(),
          owner,
          propertyType,
          value.toString(),
          event.blockNumber,
        );
      } catch (error) {
        this.logger.error('Error handling PropertyCreated event', error);
      }
    });

    // PropertyLinkedToRWA event
    contract.on('PropertyLinkedToRWA', async (tokenId, rwaContract, rwaTokenId, event) => {
      try {
        this.logger.log(`PropertyLinkedToRWA: tokenId=${tokenId}`);
        await this.handlePropertyLinkedToRWA(
          tokenId.toString(),
          rwaContract,
          rwaTokenId.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling PropertyLinkedToRWA event', error);
      }
    });

    // PropertyUpgraded event
    contract.on('PropertyUpgraded', async (tokenId, newType, newValue, event) => {
      try {
        this.logger.log(`PropertyUpgraded: tokenId=${tokenId}`);
        await this.handlePropertyUpgraded(
          tokenId.toString(),
          newType,
          newValue.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling PropertyUpgraded event', error);
      }
    });

    // Transfer event (property ownership change)
    contract.on('Transfer', async (from, to, tokenId, event) => {
      try {
        this.logger.log(`Property Transfer: tokenId=${tokenId}, from=${from}, to=${to}`);
        await this.handlePropertyTransfer(
          tokenId.toString(),
          from,
          to,
        );
      } catch (error) {
        this.logger.error('Error handling Transfer event', error);
      }
    });

    this.logger.log('PropertyNFT event listeners started');
  }

  private listenToYieldDistributorEvents() {
    const contract = this.contractsService.yieldDistributor;
    if (!contract) return;

    // YieldDistributed event
    contract.on('YieldDistributed', async (propertyId, amount, event) => {
      try {
        this.logger.log(`YieldDistributed: propertyId=${propertyId}, amount=${amount}`);
        await this.handleYieldDistributed(
          propertyId.toString(),
          amount.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling YieldDistributed event', error);
      }
    });

    // YieldClaimed event
    contract.on('YieldClaimed', async (propertyId, owner, amount, event) => {
      try {
        this.logger.log(`YieldClaimed: propertyId=${propertyId}, owner=${owner}, amount=${amount}`);
        await this.handleYieldClaimed(
          propertyId.toString(),
          owner,
          amount.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling YieldClaimed event', error);
      }
    });

    this.logger.log('YieldDistributor event listeners started');
  }

  private listenToMarketplaceEvents() {
    const contract = this.contractsService.marketplace;
    if (!contract) return;

    // PropertyListed event
    contract.on('PropertyListed', async (propertyId, seller, price, event) => {
      try {
        this.logger.log(`PropertyListed: propertyId=${propertyId}, seller=${seller}, price=${price}`);
        await this.handlePropertyListed(
          propertyId.toString(),
          seller,
          price.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling PropertyListed event', error);
      }
    });

    // PropertySold event
    contract.on('PropertySold', async (propertyId, seller, buyer, price, event) => {
      try {
        this.logger.log(`PropertySold: propertyId=${propertyId}, seller=${seller}, buyer=${buyer}`);
        await this.handlePropertySold(
          propertyId.toString(),
          seller,
          buyer,
          price.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling PropertySold event', error);
      }
    });

    // AuctionCreated event
    contract.on('AuctionCreated', async (propertyId, seller, startingPrice, endTime, event) => {
      try {
        this.logger.log(`AuctionCreated: propertyId=${propertyId}, seller=${seller}`);
        await this.handleAuctionCreated(
          propertyId.toString(),
          seller,
          startingPrice.toString(),
          endTime.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling AuctionCreated event', error);
      }
    });

    // AuctionEnded event
    contract.on('AuctionEnded', async (propertyId, winner, finalPrice, event) => {
      try {
        this.logger.log(`AuctionEnded: propertyId=${propertyId}, winner=${winner}`);
        await this.handleAuctionEnded(
          propertyId.toString(),
          winner,
          finalPrice.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling AuctionEnded event', error);
      }
    });

    // ListingCancelled event
    contract.on('ListingCancelled', async (propertyId, event) => {
      try {
        this.logger.log(`ListingCancelled: propertyId=${propertyId}`);
        await this.handleListingCancelled(propertyId.toString());
      } catch (error) {
        this.logger.error('Error handling ListingCancelled event', error);
      }
    });

    this.logger.log('Marketplace event listeners started');
  }

  private listenToQuestSystemEvents() {
    const contract = this.contractsService.questSystem;
    if (!contract) return;

    // QuestCompleted event
    contract.on('QuestCompleted', async (player, questType, reward, event) => {
      try {
        this.logger.log(`QuestCompleted: player=${player}, questType=${questType}, reward=${reward}`);
        await this.handleQuestCompleted(
          player,
          questType.toString(),
          reward.toString(),
        );
      } catch (error) {
        this.logger.error('Error handling QuestCompleted event', error);
      }
    });

    this.logger.log('QuestSystem event listeners started');
  }

  // Event handlers
  private async handlePropertyCreated(
    tokenId: string,
    owner: string,
    propertyType: number,
    value: string,
    blockNumber: number,
  ) {
    try {
      // Get or create user
      let [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, owner.toLowerCase()))
        .limit(1);

      if (!user) {
        [user] = await this.db
          .insert(schema.users)
          .values({
            walletAddress: owner.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      // Get property data from contract (includes createdAt timestamp)
      const propertyData = await this.contractsService.getProperty(BigInt(tokenId));
      
      // Use contract's createdAt timestamp (source of truth)
      // Contract stores createdAt as Unix timestamp in seconds
      const contractCreatedAtTimestamp = Number(propertyData.createdAt);
      const contractCreatedAt = new Date(contractCreatedAtTimestamp * 1000); // Convert to milliseconds
      
      // Create property in database with contract's createdAt
      const propertyTypeMap = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
      const [property] = await this.db
        .insert(schema.properties)
        .values({
          tokenId: Number(tokenId),
          ownerId: user.id,
          propertyType: propertyTypeMap[propertyType] || 'Residential',
          value: value.toString(), // Use string for numeric column
          yieldRate: Number(propertyData.yieldRate.toString()),
          isActive: true,
          createdAt: contractCreatedAt, // Use contract's createdAt (source of truth)
          updatedAt: new Date(),
        })
        .returning();

      // Emit WebSocket event
      this.websocketGateway.emitPropertyCreated({
        propertyId: property.id,
        owner: owner,
        propertyType: property.propertyType,
      });

      // Update leaderboard
      await this.leaderboardService.updateLeaderboard(user.id);

      // Update guild stats if user is in a guild
      const userGuild = await this.guildsService.getUserGuild(user.id);
      if (userGuild) {
        await this.guildsService.updateGuildStats(userGuild.id);
      }

      this.logger.log(`Property created in database: ${property.id}`);
    } catch (error) {
      this.logger.error(`Error handling PropertyCreated: ${error.message}`, error.stack);
    }
  }

  private async handlePropertyLinkedToRWA(
    tokenId: string,
    rwaContract: string,
    rwaTokenId: string,
  ) {
    try {
      await this.db
        .update(schema.properties)
        .set({
          rwaContract: rwaContract,
          rwaTokenId: Number(rwaTokenId),
          updatedAt: new Date(),
        })
        .where(eq(schema.properties.tokenId, Number(tokenId)));

      this.logger.log(`Property ${tokenId} linked to RWA`);
    } catch (error) {
      this.logger.error(`Error handling PropertyLinkedToRWA: ${error.message}`);
    }
  }

  private async handlePropertyUpgraded(
    tokenId: string,
    newType: number,
    newValue: string,
  ) {
    try {
      const propertyTypeMap = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
      await this.db
        .update(schema.properties)
        .set({
          propertyType: propertyTypeMap[newType] || 'Residential',
          value: newValue.toString(), // Use string for numeric column
          updatedAt: new Date(),
        })
        .where(eq(schema.properties.tokenId, Number(tokenId)));

      this.logger.log(`Property ${tokenId} upgraded`);
    } catch (error) {
      this.logger.error(`Error handling PropertyUpgraded: ${error.message}`);
    }
  }

  private async handlePropertyTransfer(
    tokenId: string,
    from: string,
    to: string,
  ) {
    try {
      // Skip minting transfers (from zero address)
      if (from === '0x0000000000000000000000000000000000000000') {
        return;
      }

      // Get or create new owner
      let [newOwner] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, to.toLowerCase()))
        .limit(1);

      if (!newOwner) {
        [newOwner] = await this.db
          .insert(schema.users)
          .values({
            walletAddress: to.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      // Get old owner from property
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(tokenId)))
        .limit(1);

      const oldOwnerId = property?.ownerId;

      // Update property owner
      await this.db
        .update(schema.properties)
        .set({
          ownerId: newOwner.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.properties.tokenId, Number(tokenId)));

      // Update leaderboards for both old and new owners
      if (oldOwnerId) {
        await this.leaderboardService.updateLeaderboard(oldOwnerId);
        const oldOwnerGuild = await this.guildsService.getUserGuild(oldOwnerId);
        if (oldOwnerGuild) {
          await this.guildsService.updateGuildStats(oldOwnerGuild.id);
        }
      }

      await this.leaderboardService.updateLeaderboard(newOwner.id);
      const newOwnerGuild = await this.guildsService.getUserGuild(newOwner.id);
      if (newOwnerGuild) {
        await this.guildsService.updateGuildStats(newOwnerGuild.id);
      }

      this.logger.log(`Property ${tokenId} transferred to ${to}`);
    } catch (error) {
      this.logger.error(`Error handling PropertyTransfer: ${error.message}`);
    }
  }

  private async handleYieldDistributed(
    propertyId: string,
    amount: string,
  ) {
    try {
      // Update pending yield in database (if needed)
      // Yield is calculated on-chain, so we mainly log this
      this.logger.log(`Yield distributed for property ${propertyId}: ${amount}`);
    } catch (error) {
      this.logger.error(`Error handling YieldDistributed: ${error.message}`);
    }
  }

  private async handleYieldClaimed(
    propertyId: string,
    owner: string,
    amount: string,
  ) {
    try {
      // Get property and user
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      if (!property) {
        this.logger.warn(`Property ${propertyId} not found in database`);
        return;
      }

      // Create yield record
      await this.db.insert(schema.yieldRecords).values({
        ownerId: property.ownerId,
        propertyId: property.id,
        amount: BigInt(amount),
        claimed: true,
        claimedAt: new Date(),
        createdAt: new Date(),
      });

      // Update property total yield earned
      const currentTotal = BigInt(property.totalYieldEarned?.toString() || '0');
      const newTotal = currentTotal + BigInt(amount);
      await this.db
        .update(schema.properties)
        .set({
          totalYieldEarned: newTotal,
          updatedAt: new Date(),
        })
        .where(eq(schema.properties.id, property.id));

      // Emit WebSocket event
      this.websocketGateway.emitYieldClaimed({
        propertyId: property.id,
        owner: owner,
        amount: amount,
      });

      // Emit yield time update after claim (lastYieldUpdate was reset in contract)
      // This ensures frontend shows correct time remaining for next claim
      const yieldTimeInfo = await this.yieldService.getYieldTimeInfo(owner);
      if (yieldTimeInfo && 
          yieldTimeInfo.properties.length > 0 &&
          yieldTimeInfo.yieldUpdateIntervalSeconds !== undefined &&
          yieldTimeInfo.currentBlockTimestamp !== undefined &&
          yieldTimeInfo.totalClaimableYield !== undefined) {
        this.websocketGateway.emitYieldTimeUpdate(yieldTimeInfo);
        this.logger.log(`Sent yield time update after claim for ${owner}`);
      }

      this.logger.log(`Yield claimed for property ${propertyId}: ${amount}`);
    } catch (error) {
      this.logger.error(`Error handling YieldClaimed: ${error.message}`);
    }
  }

  private async handlePropertyListed(
    propertyId: string,
    seller: string,
    price: string,
  ) {
    try {
      let [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      // If property doesn't exist in DB, sync it from blockchain first
      if (!property) {
        this.logger.log(`Property ${propertyId} not in DB, syncing from blockchain...`);
        try {
          await this.propertiesService.syncFromChain(seller);
          // Try again after sync
          [property] = await this.db
            .select()
            .from(schema.properties)
            .where(eq(schema.properties.tokenId, Number(propertyId)))
            .limit(1);
          
          if (!property) {
            this.logger.warn(`Property ${propertyId} still not found after sync`);
            return;
          }
        } catch (syncError) {
          this.logger.error(`Failed to sync property ${propertyId} before listing: ${syncError.message}`);
          return;
        }
      }

      // Create or update marketplace listing
      const existing = await this.db
        .select()
        .from(schema.marketplaceListings)
        .where(eq(schema.marketplaceListings.propertyId, property.id))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(schema.marketplaceListings).values({
          propertyId: property.id,
          sellerId: property.ownerId,
          price: price.toString(), // Ensure string for numeric column
          isActive: true,
          listingType: 'fixed', // Match frontend format
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await this.db
          .update(schema.marketplaceListings)
          .set({
            price: price.toString(), // Ensure string for numeric column
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(schema.marketplaceListings.propertyId, property.id));
      }

      this.logger.log(`Property ${propertyId} listed for ${price}`);
      
      // Emit WebSocket event for real-time updates
      this.websocketGateway.emitMarketplaceListing({
        propertyId: Number(propertyId),
        seller: seller,
        price: price,
      });
    } catch (error) {
      this.logger.error(`Error handling PropertyListed: ${error.message}`);
    }
  }

  private async handlePropertySold(
    propertyId: string,
    seller: string,
    buyer: string,
    price: string,
  ) {
    try {
      // Update listing to inactive
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      if (property) {
        await this.db
          .update(schema.marketplaceListings)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.marketplaceListings.propertyId, property.id));
      }

      // Emit WebSocket event
      this.websocketGateway.emitMarketplaceTrade({
        listingId: Number(propertyId),
        seller: seller,
        buyer: buyer,
        price: price,
      });

      this.logger.log(`Property ${propertyId} sold for ${price}`);
    } catch (error) {
      this.logger.error(`Error handling PropertySold: ${error.message}`);
    }
  }

  private async handleAuctionCreated(
    propertyId: string,
    seller: string,
    startingPrice: string,
    endTime: string,
  ) {
    try {
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      if (!property) return;

      const existing = await this.db
        .select()
        .from(schema.marketplaceListings)
        .where(eq(schema.marketplaceListings.propertyId, property.id))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(schema.marketplaceListings).values({
          propertyId: property.id,
          sellerId: property.ownerId,
          price: startingPrice.toString(), // Ensure string for numeric column
          isActive: true,
          listingType: 'auction',
          auctionEndTime: new Date(Number(endTime) * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await this.db
          .update(schema.marketplaceListings)
          .set({
            price: startingPrice.toString(), // Ensure string for numeric column
            listingType: 'auction',
            auctionEndTime: new Date(Number(endTime) * 1000),
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(schema.marketplaceListings.propertyId, property.id));
      }

      this.logger.log(`Auction created for property ${propertyId}`);
    } catch (error) {
      this.logger.error(`Error handling AuctionCreated: ${error.message}`);
    }
  }

  private async handleAuctionEnded(
    propertyId: string,
    winner: string,
    finalPrice: string,
  ) {
    try {
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      if (property) {
        await this.db
          .update(schema.marketplaceListings)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.marketplaceListings.propertyId, property.id));
      }

      this.logger.log(`Auction ended for property ${propertyId}, winner: ${winner}`);
    } catch (error) {
      this.logger.error(`Error handling AuctionEnded: ${error.message}`);
    }
  }

  private async handleListingCancelled(propertyId: string) {
    try {
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.tokenId, Number(propertyId)))
        .limit(1);

      if (property) {
        await this.db
          .update(schema.marketplaceListings)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.marketplaceListings.propertyId, property.id));

        this.logger.log(`Listing cancelled for property ${propertyId}`);
        
        // Emit WebSocket event
        const [seller] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, property.ownerId))
          .limit(1);
        
        if (seller) {
          this.websocketGateway.emitMarketplaceCancelled({
            propertyId: property.tokenId,
            seller: seller.walletAddress,
          });
        }
      } else {
        this.logger.log(`Listing cancelled for property ${propertyId} (property not found in DB)`);
      }
    } catch (error) {
      this.logger.error(`Error handling ListingCancelled: ${error.message}`);
    }
  }

  private async handleQuestCompleted(
    player: string,
    questType: string,
    reward: string,
  ) {
    try {
      // Update quest progress in database
      // This is handled by the quests service, but we log it here
      this.logger.log(`Quest completed: player=${player}, type=${questType}, reward=${reward}`);
    } catch (error) {
      this.logger.error(`Error handling QuestCompleted: ${error.message}`);
    }
  }

  // Periodic sync to catch missed events
  private startPeriodicSync() {
    setInterval(async () => {
      if (this.isIndexing) return;
      
      try {
        this.isIndexing = true;
        await this.syncMissedEvents();
      } catch (error) {
        this.logger.error('Error in periodic sync', error);
      } finally {
        this.isIndexing = false;
      }
    }, 60000); // Sync every minute
  }

  private async syncMissedEvents() {
    try {
      // Use Mantle's custom eth_getBlockRange for efficient block querying
      const currentBlock = await this.contractsService.getProvider().getBlockNumber();
      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = currentBlock - this.BLOCK_CONFIRMATIONS;

      if (fromBlock > toBlock) {
        return; // No new blocks
      }

      const blockRange = toBlock - fromBlock + 1;
      this.logger.log(`Syncing events from block ${fromBlock} to ${toBlock} (${blockRange} blocks)`);

      // Only use Mantle API for small block ranges (to avoid 413 Request Entity Too Large errors)
      // Mantle API has a limit, so we skip it for large ranges and use standard event queries
      const MAX_MANTLE_API_BLOCK_RANGE = 100; // Safe limit to avoid 413 errors
      
      if (blockRange <= MAX_MANTLE_API_BLOCK_RANGE) {
        try {
          const blocks = await this.mantleApiService.getBlockRange(fromBlock, toBlock, false);
          this.logger.log(`Retrieved ${blocks.length} blocks using Mantle eth_getBlockRange`);
        } catch (error: any) {
          // If it's a 413 error, log it but continue with standard queries
          if (error.message?.includes('413')) {
            this.logger.warn(`Mantle API block range too large (${blockRange} blocks), using standard event queries`);
          } else {
            this.logger.warn('Mantle API block range query failed, falling back to standard queries', error);
          }
        }
      } else {
        this.logger.log(`Block range too large (${blockRange} blocks), skipping Mantle API and using standard event queries`);
      }

      // Query events from contracts (this is what actually matters)
      // These use standard eth_getLogs which handles large ranges better
      await this.queryPropertyNFTEvents(fromBlock, toBlock);
      await this.queryYieldDistributorEvents(fromBlock, toBlock);
      await this.queryMarketplaceEvents(fromBlock, toBlock);
      await this.queryQuestSystemEvents(fromBlock, toBlock);

      this.lastProcessedBlock = toBlock;
    } catch (error) {
      this.logger.error('Error syncing missed events', error);
    }
  }

  private async queryPropertyNFTEvents(fromBlock: number, toBlock: number) {
    const contract = this.contractsService.propertyNFT;
    if (!contract) return;

    try {
      const filter = contract.filters.PropertyCreated();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      for (const event of events) {
        if (event.args) {
          await this.handlePropertyCreated(
            event.args.tokenId.toString(),
            event.args.owner,
            event.args.propertyType,
            event.args.value.toString(),
            event.blockNumber,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error querying PropertyNFT events', error);
    }
  }

  private async queryYieldDistributorEvents(fromBlock: number, toBlock: number) {
    const contract = this.contractsService.yieldDistributor;
    if (!contract) return;

    try {
      const filter = contract.filters.YieldClaimed();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      for (const event of events) {
        if (event.args) {
          await this.handleYieldClaimed(
            event.args.propertyId.toString(),
            event.args.owner,
            event.args.amount.toString(),
          );
        }
      }
    } catch (error) {
      this.logger.error('Error querying YieldDistributor events', error);
    }
  }

  private async queryMarketplaceEvents(fromBlock: number, toBlock: number) {
    const contract = this.contractsService.marketplace;
    if (!contract) return;

    try {
      const soldFilter = contract.filters.PropertySold();
      const soldEvents = await contract.queryFilter(soldFilter, fromBlock, toBlock);
      
      for (const event of soldEvents) {
        if (event.args) {
          await this.handlePropertySold(
            event.args.propertyId.toString(),
            event.args.seller,
            event.args.buyer,
            event.args.price.toString(),
          );
        }
      }
    } catch (error) {
      this.logger.error('Error querying Marketplace events', error);
    }
  }

  private async queryQuestSystemEvents(fromBlock: number, toBlock: number) {
    const contract = this.contractsService.questSystem;
    if (!contract) return;

    try {
      const filter = contract.filters.QuestCompleted();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      for (const event of events) {
        if (event.args) {
          await this.handleQuestCompleted(
            event.args.player,
            event.args.questType.toString(),
            event.args.reward.toString(),
          );
        }
      }
    } catch (error) {
      this.logger.error('Error querying QuestSystem events', error);
    }
  }
}

