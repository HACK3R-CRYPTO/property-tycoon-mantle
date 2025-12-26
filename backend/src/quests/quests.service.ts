import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

  async findAll() {
    return this.db.select().from(schema.quests).where(eq(schema.quests.active, true));
  }

  async getQuest(questId: number) {
    try {
      const quest = await this.contractsService.getQuest(BigInt(questId));
      return quest;
    } catch (error) {
      this.logger.error(`Error getting quest: ${error.message}`);
      throw error;
    }
  }

  async getQuestProgress(walletAddress: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    if (!user) {
      return [];
    }

    return this.db
      .select()
      .from(schema.questProgress)
      .where(eq(schema.questProgress.userId, user.id));
  }

  async checkQuestCompletion(walletAddress: string, questId: number) {
    try {
      const completed = await this.contractsService.getQuestCompletionStatus(walletAddress, BigInt(questId));
      return { completed };
    } catch (error) {
      this.logger.error(`Error checking quest completion: ${error.message}`);
      throw error;
    }
  }
}
