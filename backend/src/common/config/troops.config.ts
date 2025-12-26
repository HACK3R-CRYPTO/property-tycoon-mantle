/**
 * Troop types and their configurations
 * Similar to Clash of Clans troop system
 */

export enum TroopType {
  BARBARIAN = 'BARBARIAN',
  ARCHER = 'ARCHER',
  GIANT = 'GIANT',
  WALL_BREAKER = 'WALL_BREAKER',
}

export interface TroopStats {
  type: TroopType;
  name: string;
  description: string;

  // Combat stats
  health: number;
  damage: number;
  attackSpeed: number; // attacks per second
  moveSpeed: number; // tiles per second
  range: number; // attack range in tiles
  housingSpace: number; // how much army capacity this troop takes

  // Training
  trainingTime: number; // in seconds
  cost: {
    elixir: number;
  };

  // Targeting
  targetPreference: 'ANY' | 'DEFENSES' | 'WALLS';

  // Visual
  icon: string; // emoji or icon identifier
}

export const TROOP_CONFIGS: Record<TroopType, TroopStats> = {
  [TroopType.BARBARIAN]: {
    type: TroopType.BARBARIAN,
    name: 'Barbarian',
    description: 'Fearless melee warrior with moderate health and damage',
    health: 100,
    damage: 15,
    attackSpeed: 1, // 1 attack per second
    moveSpeed: 2,
    range: 1, // melee range
    housingSpace: 1,
    trainingTime: 20, // 20 seconds
    cost: {
      elixir: 25,
    },
    targetPreference: 'ANY',
    icon: '🗡️',
  },

  [TroopType.ARCHER]: {
    type: TroopType.ARCHER,
    name: 'Archer',
    description: 'Ranged unit with lower health but attacks from distance',
    health: 60,
    damage: 12,
    attackSpeed: 1,
    moveSpeed: 2.5,
    range: 5, // ranged attack
    housingSpace: 1,
    trainingTime: 25, // 25 seconds
    cost: {
      elixir: 30,
    },
    targetPreference: 'ANY',
    icon: '🏹',
  },

  [TroopType.GIANT]: {
    type: TroopType.GIANT,
    name: 'Giant',
    description: 'Tanky unit with high health that prioritizes defenses',
    health: 500,
    damage: 25,
    attackSpeed: 0.5, // slower attacks
    moveSpeed: 1.5, // slower movement
    range: 1,
    housingSpace: 5,
    trainingTime: 120, // 2 minutes
    cost: {
      elixir: 250,
    },
    targetPreference: 'DEFENSES',
    icon: '🦾',
  },

  [TroopType.WALL_BREAKER]: {
    type: TroopType.WALL_BREAKER,
    name: 'Wall Breaker',
    description: 'Suicide unit that deals massive damage to walls',
    health: 40,
    damage: 200, // massive damage to walls
    attackSpeed: 0, // explodes on impact
    moveSpeed: 3, // fast movement
    range: 1,
    housingSpace: 2,
    trainingTime: 30, // 30 seconds
    cost: {
      elixir: 100,
    },
    targetPreference: 'WALLS',
    icon: '💣',
  },
};

// Helper function to get troop config
export function getTroopConfig(type: TroopType): TroopStats {
  return TROOP_CONFIGS[type];
}

// Get all available troop types
export function getAllTroopTypes(): TroopType[] {
  return Object.values(TroopType);
}

// Calculate total training time for multiple troops
export function calculateTotalTrainingTime(troops: TroopType[]): number {
  return troops.reduce((total, type) => {
    return total + getTroopConfig(type).trainingTime;
  }, 0);
}

// Calculate total housing space
export function calculateHousingSpace(troops: { type: TroopType; count: number }[]): number {
  return troops.reduce((total, troop) => {
    const config = getTroopConfig(troop.type);
    return total + (config.housingSpace * troop.count);
  }, 0);
}
