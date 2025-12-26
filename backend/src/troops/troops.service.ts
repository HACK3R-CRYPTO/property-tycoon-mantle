import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, lte, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import {  army, trainingQueue } from '../database/schema';
import { getTroopConfig, calculateHousingSpace, TroopType } from '../common/config/troops.config';
import { TrainTroopDto } from './dto/train-troop.dto';
import { DATABASE_CONNECTION } from '../database/database.module';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';

@Injectable()
export class TroopsService {
  constructor(@Inject(DATABASE_CONNECTION) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Calculate total army capacity from all army camps
   */
  private async getArmyCapacity(villageId: string): Promise<number> {
    // Get all army camps for this village
    const armyCamps = await this.db
      .select()
      .from(schema.buildings)
      .where(
        and(
          eq(schema.buildings.villageId, villageId),
          eq(schema.buildings.type, BuildingType.ARMY_CAMP)
        )
      );

    // Calculate total capacity from all army camps
    // Only count camps that are fully constructed
    const now = new Date();
    let totalCapacity = 0;

    for (const camp of armyCamps) {
      const constructionCompletedAt = new Date(camp.constructionCompletedAt);
      // Only count if construction is complete
      if (now >= constructionCompletedAt) {
        const config = getBuildingConfig(BuildingType.ARMY_CAMP);
        totalCapacity += config.capacity || 0;
      }
    }

    return totalCapacity;
  }

  /**
   * Train a new troop - adds to training queue
   */
  async trainTroop(userId: string, dto: TrainTroopDto) {
    // Get user's village
    const [village] = await this.db
      .select()
      .from(schema.villages)
      .where(eq(schema.villages.userId, userId))
      .limit(1);

    if (!village) {
      throw new BadRequestException('Village not found');
    }

    // Get troop config
    const troopConfig = getTroopConfig(dto.troopType);

    // Check if user has enough elixir
    const [resources] = await this.db
      .select()
      .from(schema.resources)
      .where(eq(schema.resources.villageId, village.id))
      .limit(1);

    if (!resources || resources.elixir < troopConfig.cost.elixir) {
      throw new BadRequestException('Not enough elixir');
    }

    // Get total army capacity from all army camps
    const armyCapacity = await this.getArmyCapacity(village.id);

    // If no army camps or all under construction, can't train troops
    if (armyCapacity === 0) {
      throw new BadRequestException('No functional army camps available. Build or complete construction of an army camp first.');
    }

    // Check army capacity
    const currentArmy = await this.getArmy(village.id);
    const currentHousingSpace = calculateHousingSpace(
      currentArmy.map(a => ({ type: a.troopType as TroopType, count: a.count }))
    );

    // Check training queue
    const queue = await this.db
      .select()
      .from(trainingQueue)
      .where(eq(trainingQueue.villageId, village.id));

    const queueHousingSpace = calculateHousingSpace(
      queue.map(q => ({ type: q.troopType as TroopType, count: 1 }))
    );

    if (currentHousingSpace + queueHousingSpace + troopConfig.housingSpace > armyCapacity) {
      throw new BadRequestException(`Army capacity full (${currentHousingSpace + queueHousingSpace}/${armyCapacity})`);
    }

    // Deduct elixir
    await this.db
      .update(schema.resources)
      .set({ elixir: resources.elixir - troopConfig.cost.elixir })
      .where(eq(schema.resources.villageId, village.id));

    // Calculate completion time
    const now = new Date();
    const lastInQueue = queue.length > 0
      ? queue.sort((a, b) => b.queuePosition - a.queuePosition)[0]
      : null;

    const startTime = lastInQueue && lastInQueue.completesAt > now
      ? lastInQueue.completesAt
      : now;

    const completesAt = new Date(startTime.getTime() + troopConfig.trainingTime * 1000);

    // Add to training queue
    const [newTraining] = await this.db
      .insert(trainingQueue)
      .values({
        villageId: village.id,
        troopType: dto.troopType,
        startedAt: now,
        completesAt,
        cost: troopConfig.cost.elixir,
        queuePosition: queue.length,
      })
      .returning();

    return {
      training: newTraining,
      troopConfig,
    };
  }

  /**
   * Get training queue for a village
   */
  async getTrainingQueue(userId: string) {
    const [village] = await this.db
      .select()
      .from(schema.villages)
      .where(eq(schema.villages.userId, userId))
      .limit(1);

    if (!village) {
      throw new BadRequestException('Village not found');
    }

    const queue = await this.db
      .select()
      .from(trainingQueue)
      .where(eq(trainingQueue.villageId, village.id))
      .orderBy(trainingQueue.queuePosition);

    return queue.map(q => ({
      ...q,
      troopConfig: getTroopConfig(q.troopType as TroopType),
    }));
  }

  /**
   * Get user's army
   */
  async getArmy(villageIdOrUserId: string, isUserId = false) {
    let villageId = villageIdOrUserId;

    if (isUserId) {
      const [village] = await this.db
        .select()
        .from(schema.villages)
        .where(eq(schema.villages.userId, villageIdOrUserId))
        .limit(1);

      if (!village) {
        throw new BadRequestException('Village not found');
      }
      villageId = village.id;
    }

    const armyData = await this.db
      .select()
      .from(army)
      .where(eq(army.villageId, villageId));

    return armyData.map(a => ({
      ...a,
      troopConfig: getTroopConfig(a.troopType as TroopType),
    }));
  }

  /**
   * Cancel a training from the queue
   */
  async cancelTraining(userId: string, trainingId: string) {
    const [village] = await this.db
      .select()
      .from(schema.villages)
      .where(eq(schema.villages.userId, userId))
      .limit(1);

    if (!village) {
      throw new BadRequestException('Village not found');
    }

    // Get the training
    const [training] = await this.db
      .select()
      .from(trainingQueue)
      .where(
        and(
          eq(trainingQueue.id, trainingId),
          eq(trainingQueue.villageId, village.id)
        )
      )
      .limit(1);

    if (!training) {
      throw new BadRequestException('Training not found');
    }

    // Refund elixir
    await this.db
      .update(schema.resources)
      .set({
        elixir: sql`${schema.resources.elixir} + ${training.cost}`,
      })
      .where(eq(schema.resources.villageId, village.id));

    // Delete from queue
    await this.db
      .delete(trainingQueue)
      .where(eq(trainingQueue.id, trainingId));

    // Reorder queue
    await this.db
      .update(trainingQueue)
      .set({
        queuePosition: sql`${schema.trainingQueue.queuePosition} - 1`,
      })
      .where(
        and(
          eq(trainingQueue.villageId, village.id),
          lte(trainingQueue.queuePosition, training.queuePosition)
        )
      );

    return { message: 'Training cancelled and elixir refunded' };
  }

  /**
   * Background job to process completed trainings
   * Runs every 5 seconds to check for completed troops
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processCompletedTrainings() {
    const now = new Date();

    // Get all completed trainings
    const completedTrainings = await this.db
      .select()
      .from(trainingQueue)
      .where(lte(trainingQueue.completesAt, now));

    if (completedTrainings.length === 0) {
      return;
    }

    console.log(`Processing ${completedTrainings.length} completed trainings...`);

    for (const training of completedTrainings) {
      // Check if army record exists for this troop type
      const [existingArmy] = await this.db
        .select()
        .from(army)
        .where(
          and(
            eq(army.villageId, training.villageId),
            eq(army.troopType, training.troopType)
          )
        )
        .limit(1);

      if (existingArmy) {
        // Update count
        await this.db
          .update(army)
          .set({ count: existingArmy.count + 1 })
          .where(eq(army.id, existingArmy.id));
      } else {
        // Create new army record
        await this.db.insert(army).values({
          villageId: training.villageId,
          troopType: training.troopType,
          count: 1,
        });
      }

      // Remove from queue
      await this.db
        .delete(trainingQueue)
        .where(eq(trainingQueue.id, training.id));
    }

    console.log(`✅ Completed ${completedTrainings.length} trainings`);
  }
}
