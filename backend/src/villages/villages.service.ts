import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { villages, resources, buildings, Village, NewVillage } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';

@Injectable()
export class VillagesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async createInitialVillage(userId: string, villageName: string): Promise<Village> {
    // Create village
    const [village] = await this.db
      .insert(villages)
      .values({
        userId,
        name: villageName,
        trophies: 0,
      })
      .returning();

    // Create initial resources
    // Set lastCollectedAt to 1 hour ago so users immediately have resources to collect
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await this.db.insert(resources).values({
      villageId: village.id,
      gold: 1000,
      elixir: 1000,
      lastCollectedAt: oneHourAgo,
    });

    // Create initial buildings with internal storage fields
    const townHallConfig = getBuildingConfig(BuildingType.TOWN_HALL);
    const goldMineConfig = getBuildingConfig(BuildingType.GOLD_MINE);
    const elixirCollectorConfig = getBuildingConfig(BuildingType.ELIXIR_COLLECTOR);
    const goldStorageConfig = getBuildingConfig(BuildingType.GOLD_STORAGE);
    const elixirStorageConfig = getBuildingConfig(BuildingType.ELIXIR_STORAGE);
    const armyCampConfig = getBuildingConfig(BuildingType.ARMY_CAMP);

    // Starter buildings should be immediately functional
    const now = new Date();
    const immediately = new Date(now.getTime() - 1000); // 1 second in the past to ensure complete

    const initialBuildings = [
      // Town Hall at center
      {
        villageId: village.id,
        type: BuildingType.TOWN_HALL,
        level: 1,
        positionX: 18,
        positionY: 18,
        health: townHallConfig.maxHealth,
        maxHealth: townHallConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: 0,
        internalElixirCapacity: 0,
        lastCollectedAt: now,
        constructionCompletedAt: immediately,
      },
      // 1 Gold Mine
      {
        villageId: village.id,
        type: BuildingType.GOLD_MINE,
        level: 1,
        positionX: 10,
        positionY: 15,
        health: goldMineConfig.maxHealth,
        maxHealth: goldMineConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: goldMineConfig.capacity || 0,
        internalElixirCapacity: 0,
        lastCollectedAt: oneHourAgo,
        constructionCompletedAt: immediately,
      },
      // 1 Elixir Collector
      {
        villageId: village.id,
        type: BuildingType.ELIXIR_COLLECTOR,
        level: 1,
        positionX: 28,
        positionY: 15,
        health: elixirCollectorConfig.maxHealth,
        maxHealth: elixirCollectorConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: 0,
        internalElixirCapacity: elixirCollectorConfig.capacity || 0,
        lastCollectedAt: oneHourAgo,
        constructionCompletedAt: immediately,
      },
      // Gold Storage
      {
        villageId: village.id,
        type: BuildingType.GOLD_STORAGE,
        level: 1,
        positionX: 8,
        positionY: 25,
        health: goldStorageConfig.maxHealth,
        maxHealth: goldStorageConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: 0,
        internalElixirCapacity: 0,
        lastCollectedAt: now,
        constructionCompletedAt: immediately,
      },
      // Elixir Storage
      {
        villageId: village.id,
        type: BuildingType.ELIXIR_STORAGE,
        level: 1,
        positionX: 30,
        positionY: 25,
        health: elixirStorageConfig.maxHealth,
        maxHealth: elixirStorageConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: 0,
        internalElixirCapacity: 0,
        lastCollectedAt: now,
        constructionCompletedAt: immediately,
      },
      // Army Camp
      {
        villageId: village.id,
        type: BuildingType.ARMY_CAMP,
        level: 1,
        positionX: 18,
        positionY: 8,
        health: armyCampConfig.maxHealth,
        maxHealth: armyCampConfig.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity: 0,
        internalElixirCapacity: 0,
        lastCollectedAt: now,
        constructionCompletedAt: immediately,
      },
    ];

    await this.db.insert(buildings).values(initialBuildings);

    return village;
  }

  async findByUserId(userId: string): Promise<Village | null> {
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.userId, userId))
      .limit(1);
    return village || null;
  }

  async findById(villageId: string): Promise<Village | null> {
    const [village] = await this.db
      .select()
      .from(villages)
      .where(eq(villages.id, villageId))
      .limit(1);
    return village || null;
  }

  async getVillageWithDetails(userId: string) {
    const village = await this.findByUserId(userId);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    // Update all collectors' internal storage before returning
    await this.updateAllCollectors(village.id);

    // Get resources
    const [villageResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, village.id))
      .limit(1);

    // Get buildings
    const villageBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, village.id));

    return {
      ...village,
      resources: villageResources,
      buildings: villageBuildings,
    };
  }

  private async updateAllCollectors(villageId: string): Promise<void> {
    // Get all collector buildings
    const collectors = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, villageId));

    const now = new Date();

    for (const building of collectors) {
      // Only process gold mines and elixir collectors
      if (building.type !== BuildingType.GOLD_MINE && building.type !== BuildingType.ELIXIR_COLLECTOR) {
        continue;
      }

      // Skip buildings that are still under construction
      const constructionCompletedAt = new Date(building.constructionCompletedAt);
      if (now < constructionCompletedAt) {
        continue;
      }

      const config = getBuildingConfig(building.type as BuildingType);
      if (!config.generationRate) continue;

      // Calculate time elapsed since last collection (in hours)
      const lastCollected = new Date(building.lastCollectedAt);
      const hoursElapsed = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);

      // Calculate generated resources
      const generated = Math.floor(config.generationRate * hoursElapsed);

      if (generated <= 0) continue;

      // Update internal storage, capped by capacity
      if (building.type === BuildingType.GOLD_MINE) {
        const newInternalGold = Math.min(
          building.internalGold + generated,
          building.internalGoldCapacity
        );

        await this.db
          .update(buildings)
          .set({
            internalGold: newInternalGold,
            lastCollectedAt: now,
            updatedAt: now,
          })
          .where(eq(buildings.id, building.id));
      } else if (building.type === BuildingType.ELIXIR_COLLECTOR) {
        const newInternalElixir = Math.min(
          building.internalElixir + generated,
          building.internalElixirCapacity
        );

        await this.db
          .update(buildings)
          .set({
            internalElixir: newInternalElixir,
            lastCollectedAt: now,
            updatedAt: now,
          })
          .where(eq(buildings.id, building.id));
      }
    }
  }
}
