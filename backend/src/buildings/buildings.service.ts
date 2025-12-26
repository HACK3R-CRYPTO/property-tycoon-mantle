import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, or, not } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { villages, buildings, resources, Building } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BuildingType, getBuildingConfig, canAffordBuilding } from '../common/config/buildings.config';

@Injectable()
export class BuildingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async addStarterBuildingsToVillage(villageId: string) {
    // Check what buildings already exist
    const existingBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, villageId));

    // Check what's missing
    const hasTownHall = existingBuildings.some((b) => b.type === BuildingType.TOWN_HALL);
    const hasGoldMine = existingBuildings.some((b) => b.type === BuildingType.GOLD_MINE);
    const hasElixirCollector = existingBuildings.some((b) => b.type === BuildingType.ELIXIR_COLLECTOR);
    const hasGoldStorage = existingBuildings.some((b) => b.type === BuildingType.GOLD_STORAGE);
    const hasElixirStorage = existingBuildings.some((b) => b.type === BuildingType.ELIXIR_STORAGE);
    const hasArmyCamp = existingBuildings.some((b) => b.type === BuildingType.ARMY_CAMP);

    const newBuildings = [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const now = new Date();
    const immediately = new Date(now.getTime() - 1000); // 1 second in past for immediate functionality

    // Town Hall (center of village)
    if (!hasTownHall) {
      const townHallConfig = getBuildingConfig(BuildingType.TOWN_HALL);
      newBuildings.push({
        villageId,
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
      });
    }

    // 1 Gold Mine
    if (!hasGoldMine) {
      const goldMineConfig = getBuildingConfig(BuildingType.GOLD_MINE);
      newBuildings.push({
        villageId,
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
      });
    }

    // 1 Elixir Collector
    if (!hasElixirCollector) {
      const elixirCollectorConfig = getBuildingConfig(BuildingType.ELIXIR_COLLECTOR);
      newBuildings.push({
        villageId,
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
      });
    }

    // Gold Storage
    if (!hasGoldStorage) {
      const goldStorageConfig = getBuildingConfig(BuildingType.GOLD_STORAGE);
      newBuildings.push({
        villageId,
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
      });
    }

    // Elixir Storage
    if (!hasElixirStorage) {
      const elixirStorageConfig = getBuildingConfig(BuildingType.ELIXIR_STORAGE);
      newBuildings.push({
        villageId,
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
      });
    }

    // Army Camp
    if (!hasArmyCamp) {
      const armyCampConfig = getBuildingConfig(BuildingType.ARMY_CAMP);
      newBuildings.push({
        villageId,
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
      });
    }

    if (newBuildings.length > 0) {
      await this.db.insert(buildings).values(newBuildings);

      // Set lastCollectedAt to 1 hour ago so collectors have resources
      await this.db
        .update(resources)
        .set({ lastCollectedAt: oneHourAgo })
        .where(eq(resources.villageId, villageId));
    }

    return newBuildings.length;
  }

  async migrateAllVillages() {
    const allVillages = await this.db.select().from(villages);

    let totalAdded = 0;
    for (const village of allVillages) {
      const added = await this.addStarterBuildingsToVillage(village.id);
      totalAdded += added;
      console.log(`Added ${added} buildings to village ${village.id}`);
    }

    return { villageCount: allVillages.length, buildingsAdded: totalAdded };
  }

  async fixCollectorCapacities() {
    // Update all gold mines with correct capacity
    const goldMineConfig = getBuildingConfig(BuildingType.GOLD_MINE);
    await this.db
      .update(buildings)
      .set({
        internalGoldCapacity: goldMineConfig.capacity || 0,
        internalElixirCapacity: 0,
        lastCollectedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      })
      .where(eq(buildings.type, BuildingType.GOLD_MINE));

    // Update all elixir collectors with correct capacity
    const elixirCollectorConfig = getBuildingConfig(BuildingType.ELIXIR_COLLECTOR);
    await this.db
      .update(buildings)
      .set({
        internalGoldCapacity: 0,
        internalElixirCapacity: elixirCollectorConfig.capacity || 0,
        lastCollectedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      })
      .where(eq(buildings.type, BuildingType.ELIXIR_COLLECTOR));

    console.log('Updated all collector buildings with correct capacities');
    return { success: true };
  }

  async placeBuilding(
    villageId: string,
    buildingType: string,
    positionX: number,
    positionY: number,
  ): Promise<Building> {
    // Get building config
    const config = getBuildingConfig(buildingType as BuildingType);
    if (!config) {
      throw new BadRequestException('Invalid building type');
    }

    // Get current resources
    const [villageResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, villageId))
      .limit(1);

    if (!villageResources) {
      throw new NotFoundException('Village resources not found');
    }

    // Check if user can afford the building
    if (!canAffordBuilding(buildingType as BuildingType, villageResources.gold, villageResources.elixir)) {
      throw new BadRequestException('Insufficient resources');
    }

    // Validate placement (check collision)
    const isValid = await this.validatePlacement(
      villageId,
      positionX,
      positionY,
      config.size.width,
      config.size.height,
      null,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid placement - collision or out of bounds');
    }

    // Deduct resources
    await this.db
      .update(resources)
      .set({
        gold: villageResources.gold - config.baseCost.gold,
        elixir: villageResources.elixir - config.baseCost.elixir,
        updatedAt: new Date(),
      })
      .where(eq(resources.villageId, villageId));

    // Initialize internal storage capacities based on building type
    let internalGoldCapacity = 0;
    let internalElixirCapacity = 0;
    if (buildingType === BuildingType.GOLD_MINE && config.capacity) {
      internalGoldCapacity = config.capacity;
    } else if (buildingType === BuildingType.ELIXIR_COLLECTOR && config.capacity) {
      internalElixirCapacity = config.capacity;
    }

    // Calculate construction completion time (buildTime is in seconds)
    const now = new Date();
    const constructionCompletedAt = new Date(now.getTime() + config.buildTime * 1000);

    // Create the building
    const [newBuilding] = await this.db
      .insert(buildings)
      .values({
        villageId,
        type: buildingType,
        level: 1,
        positionX,
        positionY,
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        isActive: true,
        internalGold: 0,
        internalElixir: 0,
        internalGoldCapacity,
        internalElixirCapacity,
        lastCollectedAt: new Date(),
        constructionCompletedAt,
      })
      .returning();

    return newBuilding;
  }

  async moveBuilding(buildingId: string, positionX: number, positionY: number): Promise<Building> {
    // Get the building
    const [building] = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.id, buildingId))
      .limit(1);

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Get building config to check size
    const config = getBuildingConfig(building.type as BuildingType);

    // Validate new placement (excluding the current building)
    const isValid = await this.validatePlacement(
      building.villageId,
      positionX,
      positionY,
      config.size.width,
      config.size.height,
      buildingId,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid placement - collision or out of bounds');
    }

    // Update building position
    const [updatedBuilding] = await this.db
      .update(buildings)
      .set({
        positionX,
        positionY,
        updatedAt: new Date(),
      })
      .where(eq(buildings.id, buildingId))
      .returning();

    return updatedBuilding;
  }

  async validatePlacement(
    villageId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    excludeBuildingId: string | null,
  ): Promise<boolean> {
    // Check grid bounds (40x40 grid)
    if (x < 0 || y < 0 || x + width > 40 || y + height > 40) {
      return false;
    }

    // Get all buildings in the village (excluding the one being moved if applicable)
    const allBuildings = await this.db
      .select()
      .from(buildings)
      .where(
        excludeBuildingId
          ? and(eq(buildings.villageId, villageId), not(eq(buildings.id, excludeBuildingId)))
          : eq(buildings.villageId, villageId),
      );

    // Check collision with existing buildings
    for (const existing of allBuildings) {
      const existingConfig = getBuildingConfig(existing.type as BuildingType);

      // Check if rectangles overlap
      const newLeft = x;
      const newRight = x + width;
      const newTop = y;
      const newBottom = y + height;

      const existingLeft = existing.positionX;
      const existingRight = existing.positionX + existingConfig.size.width;
      const existingTop = existing.positionY;
      const existingBottom = existing.positionY + existingConfig.size.height;

      // Rectangles overlap if all these conditions are true
      if (newLeft < existingRight && newRight > existingLeft && newTop < existingBottom && newBottom > existingTop) {
        return false; // Collision detected
      }
    }

    return true; // No collision
  }

  async deleteBuilding(buildingId: string, villageId: string): Promise<void> {
    // Verify building belongs to village
    const [building] = await this.db
      .select()
      .from(buildings)
      .where(and(eq(buildings.id, buildingId), eq(buildings.villageId, villageId)))
      .limit(1);

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Don't allow deleting Town Hall
    if (building.type === BuildingType.TOWN_HALL) {
      throw new BadRequestException('Cannot delete Town Hall');
    }

    // Delete the building
    await this.db.delete(buildings).where(eq(buildings.id, buildingId));
  }
}
