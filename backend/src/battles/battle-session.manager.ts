import { Injectable, Inject } from '@nestjs/common';
import { BattleEvent } from './spectate.gateway';
import { SpectateGateway } from './spectate.gateway';
import { findBestTarget, TargetInfo } from './troop-ai.util';
import { findPathWithWallInfo, hasLineOfSight } from './pathfinding.util';
import { SomniaService } from '../somnia/somnia.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { users } from '../database/schema/users.schema';
import { DATABASE_CONNECTION } from '../database/database.module';

export interface Troop {
  id: string;
  type: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  range: number;
  targetType: 'ground' | 'air' | 'both';
  isAlive: boolean;
  target: Building | null;
  state: 'idle' | 'moving' | 'attacking' | 'dead';
  currentPath?: { x: number; y: number }[]; // Current pathfinding path
  targetInfo?: TargetInfo | null; // Smart targeting info
}

export interface Building {
  id: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  isDefense: boolean;
  defense?: {
    damage: number;
    range: number;
    attackSpeed: number;
    targetType: 'ground' | 'air' | 'both';
    lastAttackTime: number;
  };
}

export interface BattleSession {
  id: string;
  attackerId: string;
  attackerVillageId: string;
  defenderId: string;
  defenderVillageId: string;
  troops: Troop[];
  buildings: Building[];
  startTime: number;
  lastTickTime: number;
  tickInterval: number; // milliseconds
  status: 'waiting' | 'active' | 'completed';
  destructionPercentage: number;
  deployedTroopCount: number;
  maxTroops: number;
}

@Injectable()
export class BattleSessionManager {
  private sessions: Map<string, BattleSession> = new Map();
  private spectateGateway: SpectateGateway;
  private battlesService: any; // Will be set later to avoid circular dependency
  private somniaService: SomniaService;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  setSpectateGateway(gateway: SpectateGateway) {
    this.spectateGateway = gateway;
  }

  setBattlesService(service: any) {
    this.battlesService = service;
  }

  setSomniaService(service: SomniaService) {
    this.somniaService = service;
  }

  createSession(
    battleId: string,
    attackerId: string,
    attackerVillageId: string,
    defenderId: string,
    defenderVillageId: string,
    buildings: any[],
    maxTroops: number,
  ): BattleSession {
    const session: BattleSession = {
      id: battleId,
      attackerId,
      attackerVillageId,
      defenderId,
      defenderVillageId,
      troops: [],
      buildings: this.convertBuildings(buildings),
      startTime: Date.now(),
      lastTickTime: Date.now(),
      tickInterval: 100, // 100ms ticks (10 ticks per second)
      status: 'waiting',
      destructionPercentage: 0,
      deployedTroopCount: 0,
      maxTroops,
    };

    this.sessions.set(battleId, session);
    console.log(`Created battle session ${battleId}`);
    return session;
  }

  getSession(battleId: string): BattleSession | undefined {
    return this.sessions.get(battleId);
  }

  deleteSession(battleId: string) {
    this.sessions.delete(battleId);
    console.log(`Deleted battle session ${battleId}`);
  }

  deployTroop(
    battleId: string,
    troopType: string,
    position: { x: number; y: number },
    troopStats: any,
  ): Troop | null {
    const session = this.sessions.get(battleId);
    if (!session) {
      return null;
    }

    if (session.deployedTroopCount >= session.maxTroops) {
      console.log(`Cannot deploy more troops, max ${session.maxTroops} reached`);
      return null;
    }

    const troop: Troop = {
      id: `${troopType}_${Date.now()}_${Math.random()}`,
      type: troopType,
      position: { ...position },
      health: troopStats.health,
      maxHealth: troopStats.health,
      damage: troopStats.damage,
      speed: troopStats.speed,
      range: troopStats.range,
      targetType: troopStats.targetType || 'ground',
      isAlive: true,
      target: null,
      state: 'idle',
      currentPath: [],
      targetInfo: null,
    };

    session.troops.push(troop);
    session.deployedTroopCount++;

    // Start battle on first troop deployment
    if (session.status === 'waiting') {
      session.status = 'active';
      this.startBattleLoop(battleId);
    }

    return troop;
  }

  private convertBuildings(buildings: any[]): Building[] {
    console.log(
      'convertBuildings input:',
      buildings.map((b) => ({
        id: b.id,
        type: b.type,
        positionX: b.positionX,
        positionY: b.positionY,
        x: b.x,
        y: b.y,
      })),
    );

    const converted = buildings.map((b) => {
      const building = {
        id: b.id,
        type: b.type,
        position: { x: b.positionX || b.x || 0, y: b.positionY || b.y || 0 }, // Handle both positionX/Y and x/y
        width: b.width || b.config?.size?.width || 2,
        height: b.height || b.config?.size?.height || 2,
        health: b.config?.maxHealth || b.health || 1000,
        maxHealth: b.config?.maxHealth || b.health || 1000,
        isDestroyed: false,
        isDefense: !!b.config?.defense,
        defense: b.config?.defense
          ? {
              damage: b.config.defense.damage,
              range: b.config.defense.range,
              attackSpeed: b.config.defense.attackSpeed,
              targetType: b.config.defense.targetType,
              lastAttackTime: 0,
            }
          : undefined,
      };
      console.log(`Converted building ${b.id}:`, {
        type: building.type,
        position: building.position,
        health: building.health,
      });
      return building;
    });

    return converted;
  }

  private startBattleLoop(battleId: string) {
    const session = this.sessions.get(battleId);
    if (!session) return;

    console.log(`Starting battle loop for ${battleId}`);

    const tick = () => {
      const currentSession = this.sessions.get(battleId);
      if (!currentSession || currentSession.status !== 'active') {
        return; // Stop loop
      }

      const now = Date.now();
      const deltaTime = (now - currentSession.lastTickTime) / 1000; // seconds
      currentSession.lastTickTime = now;

      // Process battle tick
      this.processBattleTick(currentSession, deltaTime);

      // Check battle end conditions
      if (this.shouldEndBattle(currentSession)) {
        this.endBattle(battleId);
        return;
      }

      // Schedule next tick
      setTimeout(tick, currentSession.tickInterval);
    };

    // Start the loop
    tick();
  }

  private processBattleTick(session: BattleSession, deltaTime: number) {
    // 1. Process troop AI (movement and targeting)
    for (const troop of session.troops) {
      if (!troop.isAlive) continue;

      // Find target using smart AI if none or current target is destroyed
      if (!troop.targetInfo || !troop.target || troop.target.isDestroyed) {
        troop.targetInfo = findBestTarget(troop, session.buildings);

        if (troop.targetInfo) {
          troop.target = troop.targetInfo.target;
          troop.state = 'moving';
        } else {
          troop.target = null;
          troop.state = 'idle';
          continue;
        }
      }

      if (troop.target && troop.targetInfo) {
        const targetCenter = this.getBuildingCenter(troop.target);
        const distance = this.getDistance(troop.position, targetCenter);

        // Check if archer can attack over walls
        if (troop.type.toUpperCase() === 'ARCHER' && distance <= troop.range) {
          const canSeeTarget = hasLineOfSight(troop.position, targetCenter, session.buildings);
          if (canSeeTarget) {
            // Archer can attack from current position
            troop.state = 'attacking';
            this.troopAttackBuilding(troop, troop.target, session, false); // false = no wall damage
            continue;
          }
        }

        // If in melee range, attack
        if (distance <= troop.range) {
          troop.state = 'attacking';

          // Wall Breaker explodes on impact
          if (
            troop.type.toUpperCase() === 'WALL_BREAKER' &&
            troop.target.type.toLowerCase() === 'wall'
          ) {
            this.wallBreakerExplode(troop, troop.target, session);
            continue;
          }

          this.troopAttackBuilding(
            troop,
            troop.target,
            session,
            troop.targetInfo.needsToDestroyWall,
          );
        } else {
          // Move towards target using pathfinding
          troop.state = 'moving';
          this.moveTroopTowardsTarget(troop, targetCenter, deltaTime, session);
        }
      }
    }

    // 2. Process defense buildings attacking troops
    for (const building of session.buildings) {
      if (building.isDestroyed || !building.isDefense || !building.defense) continue;

      const now = Date.now();
      const timeSinceLastAttack = now - building.defense.lastAttackTime;
      const attackCooldown = (1 / building.defense.attackSpeed) * 1000; // Convert to ms

      if (timeSinceLastAttack >= attackCooldown) {
        const target = this.findClosestTroop(building, session.troops, building.defense.range);
        if (target) {
          this.buildingAttackTroop(building, target, session);
          building.defense.lastAttackTime = now;
        }
      }
    }

    // 3. Remove dead troops
    session.troops = session.troops.filter((t) => t.isAlive);

    // 4. Calculate destruction percentage
    this.updateDestructionPercentage(session);
  }

  private findClosestBuilding(troop: Troop, buildings: Building[]): Building | null {
    const aliveBuildings = buildings.filter((b) => !b.isDestroyed);
    if (aliveBuildings.length === 0) return null;

    let closest = aliveBuildings[0];
    let minDistance = this.getDistance(troop.position, this.getBuildingCenter(closest));

    for (const building of aliveBuildings) {
      const distance = this.getDistance(troop.position, this.getBuildingCenter(building));
      if (distance < minDistance) {
        minDistance = distance;
        closest = building;
      }
    }

    return closest;
  }

  private findClosestTroop(building: Building, troops: Troop[], range: number): Troop | null {
    const buildingCenter = this.getBuildingCenter(building);
    const troopsInRange = troops.filter((t) => {
      if (!t.isAlive) return false;
      const distance = this.getDistance(buildingCenter, t.position);
      return distance <= range;
    });

    if (troopsInRange.length === 0) return null;

    let closest = troopsInRange[0];
    let minDistance = this.getDistance(buildingCenter, closest.position);

    for (const troop of troopsInRange) {
      const distance = this.getDistance(buildingCenter, troop.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = troop;
      }
    }

    return closest;
  }

  /**
   * Move troop towards target with pathfinding (wall-aware)
   */
  private moveTroopTowardsTarget(
    troop: Troop,
    target: { x: number; y: number },
    deltaTime: number,
    session: BattleSession,
  ) {
    // Calculate path if needed
    if (!troop.currentPath || troop.currentPath.length === 0) {
      const pathResult = findPathWithWallInfo(troop, target, session.buildings);
      troop.currentPath = pathResult.path;

      // If no path and wall blocking, target the wall
      if (
        pathResult.hasWallBlockage &&
        pathResult.wallToDestroy &&
        troop.type.toUpperCase() !== 'ARCHER'
      ) {
        troop.target = pathResult.wallToDestroy;
        troop.targetInfo = {
          target: pathResult.wallToDestroy,
          needsToDestroyWall: true,
          wallToDestroy: pathResult.wallToDestroy,
          canAttackOverWall: false,
        };
        return;
      }
    }

    // Follow path or move directly
    let moveTarget = target;
    if (troop.currentPath && troop.currentPath.length > 0) {
      const nextWaypoint = troop.currentPath[0];
      const distanceToWaypoint = this.getDistance(troop.position, nextWaypoint);

      if (distanceToWaypoint < 0.5) {
        // Reached waypoint, remove it
        troop.currentPath.shift();
        if (troop.currentPath.length > 0) {
          moveTarget = troop.currentPath[0];
        }
      } else {
        moveTarget = nextWaypoint;
      }
    }

    // Move towards target
    const dx = moveTarget.x - troop.position.x;
    const dy = moveTarget.y - troop.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
      const moveDistance = troop.speed * deltaTime;
      const ratio = Math.min(moveDistance / distance, 1);

      const oldPosition = { ...troop.position };
      troop.position.x += dx * ratio;
      troop.position.y += dy * ratio;

      // Broadcast movement event (throttled to every 3rd tick for performance)
      if (Math.random() < 0.33) {
        this.broadcastEvent(session, 'TROOP_MOVE', {
          troopId: troop.id,
          from: oldPosition,
          to: troop.position,
        });
      }
    }
  }

  /**
   * Old simple movement (kept for fallback)
   */
  private moveTroopTowards(
    troop: Troop,
    target: { x: number; y: number },
    deltaTime: number,
    session: BattleSession,
  ) {
    const dx = target.x - troop.position.x;
    const dy = target.y - troop.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.1) {
      const moveDistance = troop.speed * deltaTime;
      const ratio = Math.min(moveDistance / distance, 1);

      const oldPosition = { ...troop.position };
      troop.position.x += dx * ratio;
      troop.position.y += dy * ratio;

      // Broadcast movement event (throttled to every 3rd tick for performance)
      if (Math.random() < 0.33) {
        this.broadcastEvent(session, 'TROOP_MOVE', {
          troopId: troop.id,
          from: oldPosition,
          to: troop.position,
        });
      }
    }
  }

  private troopAttackBuilding(
    troop: Troop,
    building: Building,
    session: BattleSession,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isWallAttack: boolean = false,
  ) {
    building.health -= troop.damage;

    if (building.health <= 0 && !building.isDestroyed) {
      building.health = 0;
      building.isDestroyed = true;

      this.broadcastEvent(session, 'BUILDING_DESTROYED', {
        buildingId: building.id,
        buildingType: building.type,
        position: building.position,
      });

      // Troop needs new target
      troop.target = null;
      troop.targetInfo = null;
    } else {
      // Emit attack event with projectile for ranged troops
      const isRanged = troop.range > 1;
      this.broadcastEvent(session, 'BUILDING_ATTACK', {
        troopId: troop.id,
        troopType: troop.type,
        buildingId: building.id,
        damage: troop.damage,
        remainingHealth: building.health,
        projectile: isRanged
          ? {
              from: troop.position,
              to: this.getBuildingCenter(building),
            }
          : undefined,
      });
    }
  }

  /**
   * Wall Breaker explodes on contact with wall, dealing massive damage
   * The wall breaker dies in the explosion
   */
  private wallBreakerExplode(troop: Troop, wall: Building, session: BattleSession) {
    // Deal massive damage to the wall
    wall.health -= troop.damage;

    // Check if wall is destroyed
    if (wall.health <= 0 && !wall.isDestroyed) {
      wall.health = 0;
      wall.isDestroyed = true;

      this.broadcastEvent(session, 'BUILDING_DESTROYED', {
        buildingId: wall.id,
        buildingType: wall.type,
        position: wall.position,
      });
    } else {
      this.broadcastEvent(session, 'BUILDING_ATTACK', {
        troopId: troop.id,
        troopType: troop.type,
        buildingId: wall.id,
        damage: troop.damage,
        remainingHealth: wall.health,
      });
    }

    // Wall Breaker dies in the explosion
    troop.health = 0;
    troop.isAlive = false;
    troop.state = 'dead';

    this.broadcastEvent(session, 'TROOP_DEATH', {
      troopId: troop.id,
      troopType: troop.type,
      position: troop.position,
      killedBy: 'explosion', // Died from own explosion
    });
  }

  private buildingAttackTroop(building: Building, troop: Troop, session: BattleSession) {
    if (!building.defense) return;

    troop.health -= building.defense.damage;

    if (troop.health <= 0 && troop.isAlive) {
      troop.health = 0;
      troop.isAlive = false;
      troop.state = 'dead';

      this.broadcastEvent(session, 'TROOP_DEATH', {
        troopId: troop.id,
        troopType: troop.type,
        position: troop.position,
        killedBy: building.id,
      });
    } else {
      this.broadcastEvent(session, 'TROOP_ATTACK', {
        buildingId: building.id,
        troopId: troop.id,
        damage: building.defense.damage,
        remainingHealth: troop.health,
        projectile: {
          from: this.getBuildingCenter(building),
          to: troop.position,
        },
      });
    }
  }

  /**
   * Update destruction percentage
   * IMPORTANT: Only non-wall buildings count towards destruction percentage
   * Walls do NOT count - this matches Clash of Clans logic
   */
  private updateDestructionPercentage(session: BattleSession) {
    // Filter out walls - only real buildings count
    const nonWallBuildings = session.buildings.filter((b) => b.type.toLowerCase() !== 'wall');

    if (nonWallBuildings.length === 0) {
      session.destructionPercentage = 100;
      return;
    }

    let totalHealth = 0;
    let remainingHealth = 0;

    for (const building of nonWallBuildings) {
      totalHealth += building.maxHealth;
      remainingHealth += building.health;
    }

    session.destructionPercentage = Math.floor(
      ((totalHealth - remainingHealth) / totalHealth) * 100,
    );
  }

  private shouldEndBattle(session: BattleSession): boolean {
    // Battle ends if:
    // 1. All buildings destroyed (100% destruction)
    if (session.destructionPercentage >= 100) {
      return true;
    }

    // 2. All troops dead and max troops deployed
    const aliveTroops = session.troops.filter((t) => t.isAlive).length;
    if (aliveTroops === 0 && session.deployedTroopCount >= session.maxTroops) {
      return true;
    }

    // 3. Battle timeout (3 minutes)
    const battleDuration = Date.now() - session.startTime;
    if (battleDuration > 3 * 60 * 1000) {
      return true;
    }

    return false;
  }

  private async endBattle(battleId: string) {
    const session = this.sessions.get(battleId);
    if (!session) return;

    session.status = 'completed';

    // Calculate stars
    let stars = 0;
    if (session.destructionPercentage >= 50) stars = 1;
    if (session.destructionPercentage >= 70) stars = 2;
    if (session.destructionPercentage >= 100) stars = 3;

    let lootGold = 0;
    let lootElixir = 0;

    // Update battle results in database and get loot amounts
    if (this.battlesService) {
      try {
        const loot = await this.battlesService.updateBattleResults(
          battleId,
          session.destructionPercentage,
          stars,
        );
        lootGold = loot?.lootGold ?? 0;
        lootElixir = loot?.lootElixir ?? 0;
      } catch (error) {
        console.error('Failed to update battle results:', error);
      }
    }

    const result = {
      battleId,
      destructionPercentage: session.destructionPercentage,
      stars,
      duration: Date.now() - session.startTime,
      lootGold,
      lootElixir,
    };

    console.log(`Battle ${battleId} ended:`, result);

    this.broadcastEvent(session, 'BATTLE_END', result);

    // Publish battle result to Somnia DataStreams for permanent history
    if (this.somniaService) {
      try {
        // Fetch attacker and defender usernames from database
        const [attackerUser] = await this.db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, session.attackerId))
          .limit(1);

        const [defenderUser] = await this.db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, session.defenderId))
          .limit(1);

        await this.somniaService.publishBattleResult({
          battleId,
          attackerId: attackerUser?.username || 'Unknown',
          defenderId: defenderUser?.username || 'Unknown',
          stars,
          destructionPercentage: session.destructionPercentage,
          lootGold,
          lootElixir,
          status: 'completed',
          timestamp: Date.now(),
        });
        console.log(`Battle result published to Somnia for ${battleId}`);
      } catch (error) {
        console.error(`Failed to publish battle result to Somnia for ${battleId}:`, error);
        // Don't throw - battle should complete even if Somnia publish fails
      }
    }

    // Clean up after 30 seconds
    setTimeout(() => {
      this.deleteSession(battleId);
    }, 30000);
  }

  private broadcastEvent(sessionOrTroop: BattleSession | Troop, type: string, data: any) {
    const battleId = 'id' in sessionOrTroop ? (sessionOrTroop as BattleSession).id : null;
    if (!battleId) return;

    console.log(`Broadcasting event ${type} for battle ${battleId}`);
    console.log('SpectateGateway present:', !!this.spectateGateway);

    const event: BattleEvent = {
      type: type as any,
      timestamp: Date.now(),
      data,
    };

    // Broadcast to all connected clients (spectators and participants) via spectate gateway
    if (this.spectateGateway) {
      this.spectateGateway.broadcastEvent(battleId, event);
    }
  }

  private getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getBuildingCenter(building: Building): { x: number; y: number } {
    return {
      x: building.position.x + building.width / 2,
      y: building.position.y + building.height / 2,
    };
  }
}
