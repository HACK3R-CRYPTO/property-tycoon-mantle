import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, sql, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class QuestsService implements OnModuleInit {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

  async onModuleInit() {
    // Wait for database and contracts to initialize
    setTimeout(async () => {
      try {
        // Check if quests table exists by trying a simple query with Drizzle
        const existingQuests = await this.db.select({ count: sql<number>`count(*)::int` }).from(schema.quests);
        const count = existingQuests[0]?.count || 0;
        
        if (count === 0) {
          this.logger.log('No quests in database, syncing from contract on startup...');
          await this.syncQuestsFromContract();
        } else {
          this.logger.log(`Found ${count} quest(s) in database`);
        }
      } catch (error: any) {
        // If table doesn't exist or connection issue, log and continue
        if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
          this.logger.warn('Quests table may not exist yet. Run "npm run db:init" to initialize database tables.');
        } else {
          this.logger.warn('Could not check quests on startup:', error.message);
        }
      }
    }, 5000); // Wait 5 seconds for database and contracts to initialize
  }

  async findAll(walletAddress?: string) {
    try {
      // First, try to sync quests from contract if database is empty
      const existingQuests = await this.db.select().from(schema.quests).limit(1);
      if (existingQuests.length === 0) {
        this.logger.log('No quests in database, syncing from contract...');
        await this.syncQuestsFromContract();
        // Try to get quests again after sync
        const questsAfterSync = await this.db.select().from(schema.quests).where(eq(schema.quests.active, true));
        return this.formatQuestsForFrontend(questsAfterSync, walletAddress);
      }
      
      const quests = await this.db.select().from(schema.quests).where(eq(schema.quests.active, true));
      return this.formatQuestsForFrontend(quests, walletAddress);
    } catch (error: any) {
      this.logger.error(`Error fetching quests: ${error.message}`);
      // Return empty array if table doesn't exist yet or other error
      if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
        this.logger.warn('Quests table does not exist. Please run "npm run db:init" to initialize database.');
        return [];
      }
      // For other errors, try to sync and return empty array
      this.logger.warn('Error fetching quests, attempting sync...');
      try {
        await this.syncQuestsFromContract();
        const quests = await this.db.select().from(schema.quests).where(eq(schema.quests.active, true));
        return this.formatQuestsForFrontend(quests, walletAddress);
      } catch (syncError: any) {
        this.logger.error('Sync also failed:', syncError.message);
        return [];
      }
    }
  }

  async formatQuestsForFrontend(quests: any[], walletAddress?: string) {
    if (!walletAddress) {
      // Return quests without progress if no wallet address
      return quests.map(q => ({
        id: q.id,
        questId: q.questId,
        title: q.name,
        description: q.description,
        reward: q.rewardAmount?.toString() || '0', // Return as string for JSON serialization
        progress: 0,
        target: q.requiredProperties || 1,
        completed: false,
        type: this.getQuestType(q.questId),
      }));
    }

    // Get user's quest progress
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      // User doesn't exist yet, return quests without progress
      return quests.map(q => ({
        id: q.id,
        questId: q.questId,
        title: q.name,
        description: q.description,
        reward: q.rewardAmount?.toString() || '0', // Return as string for JSON serialization
        progress: 0,
        target: q.requiredProperties || 1,
        completed: false,
        type: this.getQuestType(q.questId),
      }));
    }

    // Get quest progress from database
    const progressRecords = await this.db
      .select()
      .from(schema.questProgress)
      .where(eq(schema.questProgress.userId, user.id));

    // Also check contract for completion status
    const progressMap = new Map<string, { completed: boolean; progress: number }>();
    
    for (const progress of progressRecords) {
      const [quest] = await this.db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.id, progress.questId))
        .limit(1);
      if (quest) {
        progressMap.set(quest.questId.toString(), {
          completed: progress.completed,
          progress: progress.progress || 0,
        });
      }
    }

    // Check contract for completion status (in case database is out of sync)
    for (const quest of quests) {
      try {
        const contractCompleted = await this.contractsService.hasCompletedQuest(walletAddress, quest.questId);
        if (contractCompleted) {
          const existing = progressMap.get(quest.questId.toString());
          if (!existing || !existing.completed) {
            progressMap.set(quest.questId.toString(), {
              completed: true,
              progress: 100,
            });
          }
        }
      } catch (error) {
        // Ignore errors checking contract
      }
    }

    // Format quests with progress
    return quests.map(q => {
      const progress = progressMap.get(q.questId.toString()) || { completed: false, progress: 0 };
      return {
        id: q.id,
        questId: q.questId,
        title: q.name,
        description: q.description,
        reward: q.rewardAmount?.toString() || '0', // Return as string for JSON serialization
        progress: progress.progress,
        target: q.requiredProperties || 1,
        completed: progress.completed,
        type: this.getQuestType(q.questId),
      };
    });
  }

  private getQuestType(questId: number): 'diversify' | 'yield' | 'properties' | 'guild' {
    switch (questId) {
      case 0: return 'properties'; // First Property
      case 1: return 'diversify'; // Diversify Portfolio
      case 2: return 'yield'; // Yield Master
      case 3: return 'properties'; // Property Mogul
      case 4: return 'guild'; // RWA Pioneer
      default: return 'properties';
    }
  }

  async syncQuestsFromContract() {
    try {
      if (!this.contractsService.questSystem) {
        this.logger.error('QuestSystem contract not initialized');
        return;
      }

      this.logger.log('Syncing quests from QuestSystem contract...');
      
      // Quest types: 0=FirstProperty, 1=DiversifyPortfolio, 2=YieldMaster, 3=PropertyMogul, 4=RWAPioneer
      const questTypes = [0, 1, 2, 3, 4];
      const questNames = [
        'First Property',
        'Diversify Portfolio',
        'Yield Master',
        'Property Mogul',
        'RWA Pioneer'
      ];
      const questDescriptions = [
        'Mint your first property',
        'Own 3 different property types',
        'Collect yield 7 days in a row',
        'Own 10 properties',
        'Link 5 properties to RWA'
      ];

      for (let i = 0; i < questTypes.length; i++) {
        try {
          const contractQuestData = await this.contractsService.getQuest(questTypes[i]);
          
          // contractQuestData is a tuple: [questType, name, description, reward, isActive]
          const questType = questTypes[i];
          const name = questNames[i]; // Use our names since contract might not return string properly
          const description = questDescriptions[i];
          const reward = contractQuestData.reward?.toString() || contractQuestData[3]?.toString() || '0';
          const isActive = contractQuestData.isActive !== undefined ? contractQuestData.isActive : contractQuestData[4] !== undefined ? contractQuestData[4] : true;

          // Check if quest already exists
          const [existing] = await this.db
            .select()
            .from(schema.quests)
            .where(eq(schema.quests.questId, questType))
            .limit(1);

          const questDataToSave = {
            questId: questType,
            name: name,
            description: description,
            rewardAmount: reward, // Store as string for NUMERIC type
            requiredProperties: questType === 3 ? 10 : questType === 0 ? 1 : 0, // PropertyMogul needs 10, FirstProperty needs 1
            active: isActive,
            updatedAt: new Date(),
          };

          if (existing) {
            // Update existing quest
            await this.db
              .update(schema.quests)
              .set(questDataToSave)
              .where(eq(schema.quests.questId, questType));
            this.logger.log(`Updated quest ${questType}: ${name}`);
          } else {
            // Insert new quest using raw SQL with NUMERIC for large values
            const requiredProps = questType === 3 ? 10 : questType === 0 ? 1 : 0;
            
            try {
              await this.db.execute(sql`
                INSERT INTO quests (quest_id, name, description, reward_amount, required_properties, active, created_at, updated_at)
                VALUES (${questType}::bigint, ${name}, ${description || null}, ${reward}::numeric, ${requiredProps}, ${isActive}, NOW(), NOW())
                ON CONFLICT (quest_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  reward_amount = EXCLUDED.reward_amount,
                  required_properties = EXCLUDED.required_properties,
                  active = EXCLUDED.active,
                  updated_at = NOW()
              `);
              this.logger.log(`Inserted/Updated quest ${questType}: ${name}`);
            } catch (sqlError: any) {
              // Fallback to Drizzle if raw SQL fails
              this.logger.warn(`Raw SQL insert failed, trying Drizzle: ${sqlError.message}`);
              const insertData = {
                questId: questType,
                name: name,
                description: description || null,
                rewardAmount: reward, // Store as string for NUMERIC
                requiredProperties: requiredProps,
                active: isActive,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              await this.db.insert(schema.quests).values(insertData);
              this.logger.log(`Inserted quest ${questType} via Drizzle: ${name}`);
            }
          }
        } catch (error: any) {
          this.logger.error(`Error syncing quest ${questTypes[i]}: ${error.message}`);
          this.logger.error(`Error details:`, {
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            constraint: error.constraint,
            table: error.table,
            column: error.column,
          });
        }
      }

      this.logger.log('✅ Quest sync complete');
    } catch (error) {
      this.logger.error(`Error syncing quests from contract: ${error.message}`);
    }
  }

  async getQuest(questId: number) {
    try {
      // Get quest from contract by quest type (0-4)
      const questData = await this.contractsService.getQuest(questId);
      
      // Also get from database if exists
      const [dbQuest] = await this.db
        .select()
        .from(schema.quests)
        .where(eq(schema.quests.questId, questId))
        .limit(1);

      // Serialize BigInt values in contractData
      const serializedContractData = this.serializeBigInts(questData);
      const serializedDbQuest = dbQuest ? this.serializeBigInts(dbQuest) : null;

      return {
        contractData: serializedContractData,
        dbData: serializedDbQuest,
      };
    } catch (error) {
      this.logger.error(`Error getting quest: ${error.message}`);
      throw error;
    }
  }

  // Helper to recursively convert BigInt values to strings for JSON serialization
  private serializeBigInts(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigInts(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.serializeBigInts(obj[key]);
        }
      }
      return result;
    }
    
    return obj;
  }

  async getQuestProgress(walletAddress: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return [];
    }

    return this.db
      .select()
      .from(schema.questProgress)
      .where(eq(schema.questProgress.userId, user.id));
  }

  async checkQuestCompletion(walletAddress: string, questType: number) {
    try {
      const completed = await this.contractsService.hasCompletedQuest(walletAddress, questType);
      return { completed, questType };
    } catch (error) {
      this.logger.error(`Error checking quest completion: ${error.message}`);
      throw error;
    }
  }

  async syncQuestProgressForUser(walletAddress: string) {
    try {
      if (!this.contractsService.questSystem) {
        this.logger.error('QuestSystem contract not initialized');
        return;
      }

      // Get or create user
      let [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (!user) {
        [user] = await this.db
          .insert(schema.users)
          .values({
            walletAddress: walletAddress.toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      // Get all quests
      const quests = await this.db.select().from(schema.quests).where(eq(schema.quests.active, true));

      // Check completion status for each quest from contract
      for (const quest of quests) {
        try {
          const completed = await this.contractsService.hasCompletedQuest(walletAddress, quest.questId);
          
          // Get or create quest progress
          const [existingProgress] = await this.db
            .select()
            .from(schema.questProgress)
            .where(
              and(
                eq(schema.questProgress.userId, user.id),
                eq(schema.questProgress.questId, quest.id)
              )
            )
            .limit(1);

          if (existingProgress) {
            // Update existing progress
            await this.db
              .update(schema.questProgress)
              .set({
                completed: completed,
                progress: completed ? 100 : existingProgress.progress,
                updatedAt: new Date(),
                completedAt: completed && !existingProgress.completedAt ? new Date() : existingProgress.completedAt,
              })
              .where(eq(schema.questProgress.id, existingProgress.id));
          } else {
            // Create new progress entry
            await this.db.insert(schema.questProgress).values({
              questId: quest.id,
              userId: user.id,
              completed: completed,
              progress: completed ? 100 : 0,
              rewardClaimed: completed, // If completed, reward was already minted
              completedAt: completed ? new Date() : null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (error: any) {
          this.logger.error(`Error syncing quest ${quest.questId} progress: ${error.message}`);
        }
      }

      this.logger.log(`Quest progress synced for user ${walletAddress}`);
    } catch (error: any) {
      this.logger.error(`Error syncing quest progress: ${error.message}`);
      throw error;
    }
  }

  async claimQuest(walletAddress: string, questType: number) {
    try {
      if (!this.contractsService.questSystem) {
        throw new Error('QuestSystem contract not initialized');
      }

      this.logger.log(`Claiming quest ${questType} for ${walletAddress}`);

      // Call the appropriate check function based on quest type
      let tx: any;
      switch (questType) {
        case 0: // FirstProperty
          tx = await this.contractsService.questSystem.checkFirstPropertyQuest(walletAddress);
          break;
        case 1: // DiversifyPortfolio
          tx = await this.contractsService.questSystem.checkDiversifyPortfolioQuest(walletAddress);
          break;
        case 2: // YieldMaster - not implemented in contract yet
          throw new Error('YieldMaster quest not yet implemented in contract');
        case 3: // PropertyMogul
          tx = await this.contractsService.questSystem.checkPropertyMogulQuest(walletAddress);
          break;
        case 4: // RWAPioneer
          tx = await this.contractsService.questSystem.checkRWAPioneerQuest(walletAddress);
          break;
        default:
          throw new Error(`Invalid quest type: ${questType}`);
      }

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      this.logger.log(`Quest ${questType} claimed successfully. Tx: ${receipt.transactionHash}`);

      // Sync quest progress after claiming
      await this.syncQuestProgressForUser(walletAddress);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        questType,
      };
    } catch (error: any) {
      this.logger.error(`Error claiming quest ${questType}: ${error.message}`);
      throw error;
    }
  }
}
