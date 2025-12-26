import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { battles, Battle, NewBattle } from '../database/schema/battles.schema';
import { buildings } from '../database/schema/buildings.schema';
import { villages } from '../database/schema/villages.schema';
import { resources } from '../database/schema/resources.schema';
import { army } from '../database/schema/army.schema';
import { BuildingType, getBuildingConfig } from '../common/config/buildings.config';
import { TroopType, getTroopConfig, TroopStats } from '../common/config/troops.config';
import { DATABASE_CONNECTION } from '../database/database.module';
import { BattleSessionManager } from './battle-session.manager';

// Battle event types for replay
interface BattleEvent {
  timestamp: number; // milliseconds since battle start
  type:
    | 'TROOP_SPAWN'
    | 'TROOP_MOVE'
    | 'TROOP_ATTACK'
    | 'TROOP_DEATH'
    | 'BUILDING_ATTACK'
    | 'BUILDING_DESTROYED';
  data: any;
}

// Active entities during battle simulation
interface BattleTroop {
  id: string;
  type: TroopType;
  stats: TroopStats;
  health: number;
  position: { x: number; y: number };
  target: string | null; // building ID
  isAlive: boolean;
  spawnTime: number;
}

interface BattleBuilding {
  id: string;
  type: BuildingType;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isDestroyed: boolean;
  defense?: {
    damage: number;
    range: number;
    attackSpeed: number;
    lastAttackTime: number;
    target: string | null; // troop ID
  };
}

interface BattleResult {
  destructionPercentage: number;
  stars: number;
  lootGold: number;
  lootElixir: number;
  battleLog: BattleEvent[];
  victory: boolean;
}

@Injectable()
export class BattlesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
    private battleSessionManager: BattleSessionManager,
  ) {
    // Set this service on the session manager to allow it to update battle results
    this.battleSessionManager.setBattlesService(this);
  }

  /**
   * Simulate a battle between attacker's troops and defender's village
   */
  async simulateBattle(
    attackerVillageId: string,
    defenderVillageId: string,
    attackerTroops: { type: TroopType; count: number }[],
  ): Promise<BattleResult> {
    // Load defender's buildings
    const defenderBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, defenderVillageId));

    // Initialize battle state
    const battleBuildings: BattleBuilding[] = defenderBuildings.map((b) => {
      const config = getBuildingConfig(b.type as BuildingType);
      return {
        id: b.id,
        type: b.type as BuildingType,
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        position: { x: b.positionX, y: b.positionY },
        size: { width: config.size.width, height: config.size.height },
        isDestroyed: false,
        defense: config.defense
          ? {
              ...config.defense,
              lastAttackTime: 0,
              target: null,
            }
          : undefined,
      };
    });

    const battleTroops: BattleTroop[] = [];
    const battleLog: BattleEvent[] = [];

    // Spawn troops at random positions on the edge
    let troopIdCounter = 0;
    let spawnTime = 0;
    for (const troopGroup of attackerTroops) {
      const stats = getTroopConfig(troopGroup.type);
      for (let i = 0; i < troopGroup.count; i++) {
        const spawnPosition = this.getRandomSpawnPosition();
        const troop: BattleTroop = {
          id: `troop_${troopIdCounter++}`,
          type: troopGroup.type,
          stats,
          health: stats.health,
          position: spawnPosition,
          target: null,
          isAlive: true,
          spawnTime,
        };
        battleTroops.push(troop);
        battleLog.push({
          timestamp: spawnTime,
          type: 'TROOP_SPAWN',
          data: { troopId: troop.id, type: troopGroup.type, position: spawnPosition },
        });
        spawnTime += 200; // 200ms between each troop spawn
      }
    }

    // Simulate battle (tick-based, 100ms per tick, max 3 minutes)
    const TICK_DURATION = 100; // ms
    const MAX_BATTLE_TIME = 180000; // 3 minutes
    let currentTime = 0;

    while (currentTime < MAX_BATTLE_TIME) {
      const aliveTroops = battleTroops.filter((t) => t.isAlive && t.spawnTime <= currentTime);
      const aliveBuildings = battleBuildings.filter((b) => !b.isDestroyed);

      // Battle ends if all troops are dead or all buildings destroyed
      if (aliveTroops.length === 0 || aliveBuildings.length === 0) {
        break;
      }

      // Troops attack buildings
      for (const troop of aliveTroops) {
        // Find target if troop doesn't have one
        if (!troop.target || battleBuildings.find((b) => b.id === troop.target)?.isDestroyed) {
          troop.target = this.findTarget(troop, aliveBuildings);
        }

        if (troop.target) {
          const targetBuilding = battleBuildings.find((b) => b.id === troop.target);
          if (targetBuilding && !targetBuilding.isDestroyed) {
            const distance = this.calculateDistance(troop.position, targetBuilding.position);

            // Move towards target
            if (distance > troop.stats.range) {
              this.moveTroopTowards(troop, targetBuilding.position, TICK_DURATION);
            } else {
              // Attack
              const damage =
                troop.stats.damage * (troop.stats.attackSpeed * (TICK_DURATION / 1000));
              targetBuilding.health -= damage;

              battleLog.push({
                timestamp: currentTime,
                type: 'TROOP_ATTACK',
                data: {
                  troopId: troop.id,
                  buildingId: targetBuilding.id,
                  damage: damage,
                  buildingHealth: Math.max(0, targetBuilding.health),
                },
              });

              // Check if building is destroyed
              if (targetBuilding.health <= 0) {
                targetBuilding.isDestroyed = true;
                targetBuilding.health = 0;
                battleLog.push({
                  timestamp: currentTime,
                  type: 'BUILDING_DESTROYED',
                  data: { buildingId: targetBuilding.id, type: targetBuilding.type },
                });
              }
            }
          }
        }
      }

      // Buildings attack troops
      for (const building of aliveBuildings.filter((b) => b.defense)) {
        const defense = building.defense!;

        // Can attack?
        if (currentTime - defense.lastAttackTime >= defense.attackSpeed * 1000) {
          // Find target
          if (!defense.target || !aliveTroops.find((t) => t.id === defense.target)) {
            defense.target = this.findNearestTroop(building, aliveTroops, defense.range);
          }

          if (defense.target) {
            const targetTroop = battleTroops.find((t) => t.id === defense.target);
            if (targetTroop && targetTroop.isAlive) {
              const distance = this.calculateDistance(building.position, targetTroop.position);

              if (distance <= defense.range) {
                targetTroop.health -= defense.damage;
                defense.lastAttackTime = currentTime;

                battleLog.push({
                  timestamp: currentTime,
                  type: 'BUILDING_ATTACK',
                  data: {
                    buildingId: building.id,
                    troopId: targetTroop.id,
                    damage: defense.damage,
                    troopHealth: Math.max(0, targetTroop.health),
                  },
                });

                // Check if troop died
                if (targetTroop.health <= 0) {
                  targetTroop.isAlive = false;
                  targetTroop.health = 0;
                  battleLog.push({
                    timestamp: currentTime,
                    type: 'TROOP_DEATH',
                    data: { troopId: targetTroop.id, type: targetTroop.type },
                  });
                }
              }
            }
          }
        }
      }

      currentTime += TICK_DURATION;
    }

    // Calculate results
    const totalBuildings = battleBuildings.length;
    const destroyedBuildings = battleBuildings.filter((b) => b.isDestroyed).length;
    const destructionPercentage = Math.floor((destroyedBuildings / totalBuildings) * 100);

    // Calculate stars (CoC style: 50% = 1 star, 100% = 2 stars, Town Hall = +1 star)
    let stars = 0;
    if (destructionPercentage >= 50) stars = 1;
    if (destructionPercentage === 100) stars = 2;
    const townHallDestroyed = battleBuildings.find(
      (b) => b.type === BuildingType.TOWN_HALL && b.isDestroyed,
    );
    if (townHallDestroyed) stars += 1;
    stars = Math.min(stars, 3);

    // Calculate loot
    const { lootGold, lootElixir } = await this.calculateLoot(
      defenderVillageId,
      destructionPercentage,
    );

    return {
      destructionPercentage,
      stars,
      lootGold,
      lootElixir,
      battleLog,
      victory: stars > 0,
    };
  }

  /**
   * Find target building based on troop preferences
   */
  private findTarget(troop: BattleTroop, buildings: BattleBuilding[]): string | null {
    const preference = troop.stats.targetPreference;
    let candidates = buildings.filter((b) => !b.isDestroyed);

    // Filter by preference
    if (preference === 'DEFENSES') {
      const defenseBuildings = candidates.filter((b) => b.defense);
      if (defenseBuildings.length > 0) candidates = defenseBuildings;
    } else if (preference === 'WALLS') {
      const walls = candidates.filter((b) => b.type === BuildingType.WALL);
      if (walls.length > 0) candidates = walls;
    }

    // Find nearest
    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    let minDistance = this.calculateDistance(troop.position, nearest.position);

    for (const building of candidates.slice(1)) {
      const distance = this.calculateDistance(troop.position, building.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = building;
      }
    }

    return nearest.id;
  }

  /**
   * Find nearest troop in range for building defense
   */
  private findNearestTroop(
    building: BattleBuilding,
    troops: BattleTroop[],
    range: number,
  ): string | null {
    let nearest: BattleTroop | null = null;
    let minDistance = Infinity;

    for (const troop of troops.filter((t) => t.isAlive)) {
      const distance = this.calculateDistance(building.position, troop.position);
      if (distance <= range && distance < minDistance) {
        minDistance = distance;
        nearest = troop;
      }
    }

    return nearest?.id || null;
  }

  /**
   * Move troop towards target position
   */
  private moveTroopTowards(
    troop: BattleTroop,
    targetPosition: { x: number; y: number },
    tickDuration: number,
  ): void {
    const dx = targetPosition.x - troop.position.x;
    const dy = targetPosition.y - troop.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const moveDistance = troop.stats.moveSpeed * (tickDuration / 1000);
    const ratio = Math.min(moveDistance / distance, 1);

    troop.position.x += dx * ratio;
    troop.position.y += dy * ratio;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
  ): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get random spawn position (edge of map)
   */
  private getRandomSpawnPosition(): { x: number; y: number } {
    const MAP_SIZE = 40;
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left

    switch (edge) {
      case 0: // top
        return { x: Math.random() * MAP_SIZE, y: 0 };
      case 1: // right
        return { x: MAP_SIZE, y: Math.random() * MAP_SIZE };
      case 2: // bottom
        return { x: Math.random() * MAP_SIZE, y: MAP_SIZE };
      case 3: // left
        return { x: 0, y: Math.random() * MAP_SIZE };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Calculate loot based on destruction percentage
   */
  private async calculateLoot(
    defenderVillageId: string,
    destructionPercentage: number,
  ): Promise<{ lootGold: number; lootElixir: number }> {
    // Get defender's resources
    const [defenderResources] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.villageId, defenderVillageId))
      .limit(1);

    if (!defenderResources) {
      return { lootGold: 0, lootElixir: 0 };
    }

    // Loot formula: percentage of available resources based on destruction
    // Max loot: 20% of available resources at 100% destruction
    const lootPercentage = (destructionPercentage / 100) * 0.2; // 0% to 20%

    const lootGold = Math.floor(defenderResources.gold * lootPercentage);
    const lootElixir = Math.floor(defenderResources.elixir * lootPercentage);

    return { lootGold, lootElixir };
  }

  /**
   * Create a battle record and distribute loot
   */
  async createBattle(
    attackerId: string,
    defenderId: string,
    attackerTroops: { type: TroopType; count: number }[],
  ): Promise<Battle> {
    // Simulate battle
    const result = await this.simulateBattle(attackerId, defenderId, attackerTroops);

    // Create battle record
    const [battle] = await this.db
      .insert(battles)
      .values({
        attackerId,
        defenderId,
        attackerTroops: attackerTroops as any,
        destructionPercentage: result.destructionPercentage,
        stars: result.stars,
        lootGold: result.lootGold,
        lootElixir: result.lootElixir,
        battleLog: result.battleLog as any,
        status: 'completed',
      })
      .returning();

    // Give loot to attacker (increment existing resources)
    if (result.lootGold > 0 || result.lootElixir > 0) {
      await this.db
        .update(resources)
        .set({
          gold: sql`${resources.gold} + ${result.lootGold}`,
          elixir: sql`${resources.elixir} + ${result.lootElixir}`,
        })
        .where(eq(resources.villageId, attackerId));
    }

    return battle;
  }

  /**
   * Get battle history for a village (attacks made by this village)
   */
  async getBattleHistory(villageId: string, limit: number = 20): Promise<Battle[]> {
    console.log('getBattleHistory - villageId:', villageId, 'limit:', limit);

    if (!villageId) {
      console.error('getBattleHistory - villageId is undefined!');
      return [];
    }

    const history = await this.db
      .select()
      .from(battles)
      .where(eq(battles.attackerId, villageId))
      .orderBy(desc(battles.createdAt))
      .limit(limit);

    console.log('getBattleHistory - found battles:', history.length);

    return history;
  }

  /**
   * Get defense history for a village (attacks against this village)
   */
  async getDefenseHistory(villageId: string, limit: number = 20): Promise<Battle[]> {
    console.log('getDefenseHistory - villageId:', villageId, 'limit:', limit);

    if (!villageId) {
      console.error('getDefenseHistory - villageId is undefined!');
      return [];
    }

    const history = await this.db
      .select()
      .from(battles)
      .where(eq(battles.defenderId, villageId))
      .orderBy(desc(battles.createdAt))
      .limit(limit);

    console.log('getDefenseHistory - found battles:', history.length);

    return history;
  }

  /**
   * Get all recent battles (public, no auth required)
   * Used for landing page spectator view
   */
  async getAllRecentBattles(limit: number = 50) {
    const battlesData = await this.db
      .select({
        id: battles.id,
        attackerId: battles.attackerId,
        defenderId: battles.defenderId,
        attackerTroops: battles.attackerTroops,
        destructionPercentage: battles.destructionPercentage,
        stars: battles.stars,
        lootGold: battles.lootGold,
        lootElixir: battles.lootElixir,
        status: battles.status,
        createdAt: battles.createdAt,
        attackerVillage: {
          id: villages.id,
          name: villages.name,
        },
      })
      .from(battles)
      .leftJoin(villages, eq(battles.attackerId, villages.id))
      .orderBy(desc(battles.createdAt))
      .limit(limit);

    // Fetch defender village names separately
    const result = await Promise.all(
      battlesData.map(async (battle) => {
        const [defenderVillage] = await this.db
          .select({
            id: villages.id,
            name: villages.name,
          })
          .from(villages)
          .where(eq(villages.id, battle.defenderId))
          .limit(1);

        return {
          ...battle,
          defenderVillage: defenderVillage || { id: battle.defenderId, name: 'Unknown' },
        };
      }),
    );

    return result;
  }

  /**
   * Get a single battle by ID
   */
  async getBattleById(battleId: string): Promise<Battle | null> {
    const [battle] = await this.db.select().from(battles).where(eq(battles.id, battleId)).limit(1);

    return battle || null;
  }

  /**
   * Start a real-time battle session
   * Creates a battle session for interactive troop deployment
   */
  async startBattle(
    attackerId: string,
    attackerVillageId: string,
    defenderVillageId: string,
    maxTroops: { type: TroopType; count: number }[],
  ) {
    console.log('Starting real-time battle:', { attackerId, attackerVillageId, defenderVillageId });

    // Validate and deduct troops from attacker's army
    await this.consumeTroops(attackerVillageId, maxTroops);
    console.log('Troops consumed from army:', maxTroops);

    // Get attacker's village to find attacker name
    const attackerVillage = await this.db
      .select()
      .from(villages)
      .where(eq(villages.id, attackerVillageId))
      .limit(1);

    if (!attackerVillage || attackerVillage.length === 0) {
      throw new Error('Attacker village not found');
    }

    // Get defender's village to find defender user
    const defenderVillage = await this.db
      .select()
      .from(villages)
      .where(eq(villages.id, defenderVillageId))
      .limit(1);

    if (!defenderVillage || defenderVillage.length === 0) {
      throw new Error('Defender village not found');
    }

    const defenderId = defenderVillage[0].userId;

    // Load defender's buildings with their configs
    const defenderBuildings = await this.db
      .select()
      .from(buildings)
      .where(eq(buildings.villageId, defenderVillageId));

    console.log(
      'Loaded defender buildings from DB:',
      defenderBuildings.map((b) => ({
        id: b.id,
        type: b.type,
        positionX: b.positionX,
        positionY: b.positionY,
      })),
    );

    // Attach building configs to buildings
    const buildingsWithConfigs = defenderBuildings.map((b) => ({
      ...b,
      config: getBuildingConfig(b.type as BuildingType),
    }));

    console.log(
      'Buildings with configs:',
      buildingsWithConfigs.map((b) => ({
        id: b.id,
        type: b.type,
        positionX: b.positionX,
        positionY: b.positionY,
        hasConfig: !!b.config,
      })),
    );

    // Calculate total troop count
    const totalTroopCount = maxTroops.reduce((sum, t) => sum + t.count, 0);

    // Create battle record
    const newBattle: NewBattle = {
      attackerId: attackerVillageId,
      defenderId: defenderVillageId,
      attackerTroops: maxTroops,
      status: 'active',
    };

    const [battleRecord] = await this.db.insert(battles).values(newBattle).returning();

    // Create battle session
    const session = this.battleSessionManager.createSession(
      battleRecord.id,
      attackerId,
      attackerVillageId,
      defenderId,
      defenderVillageId,
      buildingsWithConfigs,
      totalTroopCount,
    );

    // Note: Attack notifications were previously handled by BattlesGateway
    // This can be re-implemented if needed via a notification service

    return {
      battleId: battleRecord.id,
      session: {
        id: session.id,
        status: session.status,
        buildings: session.buildings.map((b) => ({
          id: b.id,
          type: b.type,
          position: b.position,
          health: b.health,
          maxHealth: b.maxHealth,
        })),
        maxTroops: session.maxTroops,
      },
    };
  }

  /**
   * Find a random opponent village (for PvE)
   */
  async findRandomOpponent(attackerVillageId: string): Promise<string | null> {
    console.log('findRandomOpponent - attackerVillageId:', attackerVillageId);

    if (!attackerVillageId) {
      console.error('findRandomOpponent - attackerVillageId is undefined!');
      return null;
    }

    // Get all villages except attacker's
    const opponents = await this.db
      .select()
      .from(villages)
      .where(ne(villages.id, attackerVillageId));

    console.log('findRandomOpponent - found opponents:', opponents.length);

    if (opponents.length === 0) return null;

    // Return random opponent
    const randomIndex = Math.floor(Math.random() * opponents.length);
    console.log('findRandomOpponent - selected opponent:', opponents[randomIndex].id);
    return opponents[randomIndex].id;
  }

  /**
   * Update battle results when a real-time battle ends
   */
  async updateBattleResults(
    battleId: string,
    destructionPercentage: number,
    stars: number,
  ): Promise<{ lootGold: number; lootElixir: number } | null> {
    console.log(
      `Updating battle ${battleId} results: ${destructionPercentage}% destruction, ${stars} stars`,
    );

    // Calculate loot based on destruction percentage
    const battleRecord = await this.getBattleById(battleId);
    if (!battleRecord) {
      console.error(`Battle ${battleId} not found for update`);
      return null;
    }

    const { lootGold, lootElixir } = await this.calculateLoot(
      battleRecord.defenderId,
      destructionPercentage,
    );

    // Update battle record
    await this.db
      .update(battles)
      .set({
        destructionPercentage,
        stars,
        lootGold,
        lootElixir,
        status: 'completed',
      })
      .where(eq(battles.id, battleId));

    // Give loot to attacker
    if (lootGold > 0 || lootElixir > 0) {
      await this.db
        .update(resources)
        .set({
          gold: sql`${resources.gold} + ${lootGold}`,
          elixir: sql`${resources.elixir} + ${lootElixir}`,
        })
        .where(eq(resources.villageId, battleRecord.attackerId));

      console.log(`Awarded ${lootGold} gold and ${lootElixir} elixir to attacker`);
    }

    return { lootGold, lootElixir };
  }

  /**
   * Consume troops from army when starting a battle
   */
  private async consumeTroops(
    villageId: string,
    troops: { type: TroopType; count: number }[],
  ): Promise<void> {
    // TODO: Make this an atomic transaction
    for (const troopGroup of troops) {
      // Get current troop count
      const [armyRecord] = await this.db
        .select()
        .from(army)
        .where(and(eq(army.villageId, villageId), eq(army.troopType, troopGroup.type)))
        .limit(1);

      if (!armyRecord) {
        throw new Error(`Troop type ${troopGroup.type} not found in army`);
      }

      if (armyRecord.count < troopGroup.count) {
        throw new Error(
          `Insufficient troops: have ${armyRecord.count} ${troopGroup.type}, need ${troopGroup.count}`,
        );
      }

      // Deduct troops
      await this.db
        .update(army)
        .set({
          count: sql`${army.count} - ${troopGroup.count}`,
          updatedAt: new Date(),
        })
        .where(eq(army.id, armyRecord.id));

      console.log(`Deducted ${troopGroup.count} ${troopGroup.type} from village ${villageId}`);
    }
  }

  /**
   * Get active battles for a user (ongoing battles they can rejoin)
   */
  async getActiveBattlesForUser(villageId: string) {
    const activeBattles = await this.db
      .select({
        id: battles.id,
        attackerId: battles.attackerId,
        defenderId: battles.defenderId,
        attackerTroops: battles.attackerTroops,
        destructionPercentage: battles.destructionPercentage,
        stars: battles.stars,
        lootGold: battles.lootGold,
        lootElixir: battles.lootElixir,
        status: battles.status,
        createdAt: battles.createdAt,
        attackerVillage: {
          id: villages.id,
          name: villages.name,
        },
      })
      .from(battles)
      .innerJoin(villages, eq(battles.attackerId, villages.id)) // Use INNER JOIN - attacker must exist
      .where(and(eq(battles.attackerId, villageId), eq(battles.status, 'active')))
      .orderBy(desc(battles.createdAt))
      .limit(20);

    // Filter out battles where session no longer exists and mark them as completed
    const validBattles = [];
    for (const battle of activeBattles) {
      const session = this.battleSessionManager.getSession(battle.id);
      if (session) {
        validBattles.push(battle);
      } else {
        // Session doesn't exist but battle is marked active - clean it up
        console.log(`Cleaning up stale battle ${battle.id} - session not found`);
        try {
          await this.db
            .update(battles)
            .set({ status: 'completed' })
            .where(eq(battles.id, battle.id));
        } catch (error) {
          console.error(`Failed to cleanup stale battle ${battle.id}:`, error);
        }
      }
    }

    // Get defender village names for each valid battle
    const battlesWithDefender = await Promise.all(
      validBattles.map(async (battle) => {
        try {
          const [defenderVillage] = await this.db
            .select({ id: villages.id, name: villages.name })
            .from(villages)
            .where(eq(villages.id, battle.defenderId))
            .limit(1);

          return {
            ...battle,
            defenderVillage: defenderVillage || {
              id: battle.defenderId || 'unknown',
              name: 'Unknown',
            },
          };
        } catch (error) {
          console.error(`Failed to fetch defender village for battle ${battle.id}:`, error);
          return {
            ...battle,
            defenderVillage: { id: battle.defenderId || 'unknown', name: 'Unknown' },
          };
        }
      }),
    );

    return battlesWithDefender;
  }

  /**
   * Cleanup stale battles (battles marked active but with no session)
   * Should be called periodically
   */
  async cleanupStaleBattles(): Promise<number> {
    try {
      // Find all active battles
      const activeBattles = await this.db
        .select({ id: battles.id })
        .from(battles)
        .where(eq(battles.status, 'active'));

      let cleanedCount = 0;

      for (const battle of activeBattles) {
        const session = this.battleSessionManager.getSession(battle.id);
        if (!session) {
          // Mark as completed
          try {
            await this.db
              .update(battles)
              .set({ status: 'completed' })
              .where(eq(battles.id, battle.id));
            cleanedCount++;
          } catch (error) {
            console.error(`Failed to cleanup battle ${battle.id}:`, error);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} stale battles`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error in cleanupStaleBattles:', error);
      return 0;
    }
  }

  /**
   * Get battle session by session ID for rejoining
   */
  async getBattleSessionById(sessionId: string, userId: string) {
    // Get the battle session from the session manager
    const session = this.battleSessionManager.getSession(sessionId);

    if (!session) {
      console.log(`Session ${sessionId} not found in manager`);
      return null;
    }

    // Verify user owns this battle
    if (session.attackerId !== userId) {
      console.log(`User ${userId} does not own session ${sessionId}`);
      return null;
    }

    // Get battle record (session.id is the battle ID)
    const battle = await this.getBattleById(session.id);
    if (!battle || battle.status !== 'active') {
      console.log(`Battle ${session.id} not found or not active`);
      return null;
    }

    return {
      battleId: session.id,
      session: {
        id: session.id,
        status: session.status,
        buildings: session.buildings,
        maxTroops: session.maxTroops,
      },
      troops: battle.attackerTroops, // Include troops from battle record for rejoin
    };
  }
}
