/**
 * Troop AI utility for smart targeting
 * Implements Clash of Clans-style troop behavior
 */

import { Building, Troop } from './battle-session.manager';
import { hasLineOfSight, findWallsInPath } from './pathfinding.util';

export interface TargetInfo {
  target: Building;
  needsToDestroyWall: boolean; // If true, must destroy wall to reach target
  wallToDestroy: Building | null; // The wall blocking the path
  canAttackOverWall: boolean; // If true (archers), can attack without destroying wall
}

/**
 * Find the best target for a troop based on its type and behavior
 */
export function findBestTarget(troop: Troop, buildings: Building[]): TargetInfo | null {
  const troopType = troop.type.toUpperCase();

  switch (troopType) {
    case 'WALL_BREAKER':
      return findTargetForWallBreaker(troop, buildings);
    case 'ARCHER':
      return findTargetForArcher(troop, buildings);
    case 'GIANT':
      return findTargetForGiant(troop, buildings);
    case 'BARBARIAN':
    default:
      return findTargetForBarbarian(troop, buildings);
  }
}

/**
 * WALL BREAKER: Only targets walls, seeks closest wall
 */
function findTargetForWallBreaker(troop: Troop, buildings: Building[]): TargetInfo | null {
  const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');

  if (walls.length === 0) {
    // No walls left, wall breaker becomes idle or targets any building
    const anyBuilding = findClosestBuilding(troop, buildings, false);
    if (!anyBuilding) return null;

    return {
      target: anyBuilding,
      needsToDestroyWall: false,
      wallToDestroy: null,
      canAttackOverWall: false,
    };
  }

  // Find closest wall
  const closestWall = findClosestBuilding(troop, walls, false);
  if (!closestWall) return null;

  return {
    target: closestWall,
    needsToDestroyWall: true,
    wallToDestroy: closestWall,
    canAttackOverWall: false,
  };
}

/**
 * ARCHER: Ranged unit, can attack over walls
 * Priority: Any building in range > closest building
 * Only destroys walls if they block movement to target
 */
function findTargetForArcher(troop: Troop, buildings: Building[]): TargetInfo | null {
  const nonWallBuildings = buildings.filter(
    (b) => !b.isDestroyed && b.type.toLowerCase() !== 'wall',
  );

  if (nonWallBuildings.length === 0) {
    // Only walls left, target walls
    const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');
    const closestWall = findClosestBuilding(troop, walls, false);
    if (!closestWall) return null;

    return {
      target: closestWall,
      needsToDestroyWall: true,
      wallToDestroy: closestWall,
      canAttackOverWall: false,
    };
  }

  // Find closest building (excluding walls)
  const target = findClosestBuilding(troop, nonWallBuildings, false);
  if (!target) return null;

  const distance = getDistance(troop.position, getBuildingCenter(target));

  // Check if archer can see the target (no walls blocking line of sight)
  const hasLOS = hasLineOfSight(troop.position, getBuildingCenter(target), buildings);

  // If in range and has line of sight, can attack over wall
  if (distance <= troop.range && hasLOS) {
    return {
      target,
      needsToDestroyWall: false,
      wallToDestroy: null,
      canAttackOverWall: true,
    };
  }

  // Not in range, need to move closer
  // Check if walls block the path
  const wallsInPath = findWallsInPath(troop.position, getBuildingCenter(target), buildings);

  if (wallsInPath.length > 0) {
    // Wall blocks path, must destroy it
    const closestWallInPath = findClosestBuilding(troop, wallsInPath, false);
    return {
      target: closestWallInPath!,
      needsToDestroyWall: true,
      wallToDestroy: closestWallInPath!,
      canAttackOverWall: false,
    };
  }

  // No walls blocking, just move to target
  return {
    target,
    needsToDestroyWall: false,
    wallToDestroy: null,
    canAttackOverWall: false,
  };
}

/**
 * GIANT: Melee unit that prefers defensive buildings
 * Priority: Defenses > Any building
 * Must destroy walls to pass through
 */
function findTargetForGiant(troop: Troop, buildings: Building[]): TargetInfo | null {
  // First, try to find defensive buildings
  const defenses = buildings.filter(
    (b) => !b.isDestroyed && b.isDefense && b.type.toLowerCase() !== 'wall',
  );

  let target: Building | null = null;

  if (defenses.length > 0) {
    target = findClosestBuilding(troop, defenses, false);
  } else {
    // No defenses, target any building (excluding walls)
    const nonWallBuildings = buildings.filter(
      (b) => !b.isDestroyed && b.type.toLowerCase() !== 'wall',
    );
    target = findClosestBuilding(troop, nonWallBuildings, false);
  }

  if (!target) {
    // Only walls left, target walls
    const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');
    const wallTarget = findClosestBuilding(troop, walls, false);
    if (!wallTarget) return null;

    return {
      target: wallTarget,
      needsToDestroyWall: true,
      wallToDestroy: wallTarget,
      canAttackOverWall: false,
    };
  }

  // Check if walls block the path
  const wallsInPath = findWallsInPath(troop.position, getBuildingCenter(target), buildings);

  if (wallsInPath.length > 0) {
    // Wall blocks path, must destroy it first
    const closestWallInPath = findClosestBuilding(troop, wallsInPath, false);
    return {
      target: closestWallInPath!,
      needsToDestroyWall: true,
      wallToDestroy: closestWallInPath!,
      canAttackOverWall: false,
    };
  }

  // No walls blocking
  return {
    target,
    needsToDestroyWall: false,
    wallToDestroy: null,
    canAttackOverWall: false,
  };
}

/**
 * BARBARIAN: Basic melee unit
 * Priority: Closest building
 * Must destroy walls to pass through
 */
function findTargetForBarbarian(troop: Troop, buildings: Building[]): TargetInfo | null {
  // Find closest building (excluding walls if there are non-wall buildings)
  const nonWallBuildings = buildings.filter(
    (b) => !b.isDestroyed && b.type.toLowerCase() !== 'wall',
  );

  let target: Building | null = null;

  if (nonWallBuildings.length > 0) {
    target = findClosestBuilding(troop, nonWallBuildings, false);
  } else {
    // Only walls left, target walls
    const walls = buildings.filter((b) => !b.isDestroyed && b.type.toLowerCase() === 'wall');
    target = findClosestBuilding(troop, walls, false);
  }

  if (!target) return null;

  // Check if walls block the path
  const wallsInPath = findWallsInPath(troop.position, getBuildingCenter(target), buildings);

  if (wallsInPath.length > 0) {
    // Wall blocks path, must destroy it first
    const closestWallInPath = findClosestBuilding(troop, wallsInPath, false);
    return {
      target: closestWallInPath!,
      needsToDestroyWall: true,
      wallToDestroy: closestWallInPath!,
      canAttackOverWall: false,
    };
  }

  // No walls blocking
  return {
    target,
    needsToDestroyWall: false,
    wallToDestroy: null,
    canAttackOverWall: false,
  };
}

// Helper functions

function findClosestBuilding(
  troop: Troop,
  buildings: Building[],
  excludeWalls: boolean = true,
): Building | null {
  let filteredBuildings = buildings.filter((b) => !b.isDestroyed);

  if (excludeWalls) {
    filteredBuildings = filteredBuildings.filter((b) => b.type.toLowerCase() !== 'wall');
  }

  if (filteredBuildings.length === 0) return null;

  let closest = filteredBuildings[0];
  let minDistance = getDistance(troop.position, getBuildingCenter(closest));

  for (const building of filteredBuildings) {
    const distance = getDistance(troop.position, getBuildingCenter(building));
    if (distance < minDistance) {
      minDistance = distance;
      closest = building;
    }
  }

  return closest;
}

function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getBuildingCenter(building: Building): { x: number; y: number } {
  return {
    x: building.position.x + building.width / 2,
    y: building.position.y + building.height / 2,
  };
}
