export enum BuildingType {
  TOWN_HALL = 'town_hall',
  GOLD_MINE = 'gold_mine',
  ELIXIR_COLLECTOR = 'elixir_collector',
  GOLD_STORAGE = 'gold_storage',
  ELIXIR_STORAGE = 'elixir_storage',
  CANNON = 'cannon',
  ARCHER_TOWER = 'archer_tower',
  WALL = 'wall',
  ARMY_CAMP = 'army_camp',
  BARRACKS = 'barracks',
}

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  description: string;
  category: 'resource' | 'defense' | 'army' | 'special';
  baseCost: {
    gold: number;
    elixir: number;
  };
  buildTime: number; // seconds
  size: {
    width: number;
    height: number;
  };
  maxHealth: number;
  // Resource generation (for mines/collectors)
  generationRate?: number; // per hour
  capacity?: number; // max storage
  // Defense properties (for defensive buildings)
  defense?: {
    damage: number; // damage per shot
    range: number; // attack range in tiles
    attackSpeed: number; // seconds between shots
    targetType: 'ground' | 'air' | 'both'; // what can it target
  };
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.TOWN_HALL]: {
    type: BuildingType.TOWN_HALL,
    name: 'Town Hall',
    description: 'The heart of your village',
    category: 'special',
    baseCost: { gold: 0, elixir: 0 },
    buildTime: 0,
    size: { width: 4, height: 4 },
    maxHealth: 1500,
  },
  [BuildingType.GOLD_MINE]: {
    type: BuildingType.GOLD_MINE,
    name: 'Gold Mine',
    description: 'Generates gold over time',
    category: 'resource',
    baseCost: { gold: 0, elixir: 50 },
    buildTime: 30,
    size: { width: 3, height: 3 },
    maxHealth: 400,
    generationRate: 250, // 100 gold per hour
    capacity: 500,
  },
  [BuildingType.ELIXIR_COLLECTOR]: {
    type: BuildingType.ELIXIR_COLLECTOR,
    name: 'Elixir Collector',
    description: 'Generates elixir over time',
    category: 'resource',
    baseCost: { gold: 50, elixir: 0 },
    buildTime: 30,
    size: { width: 3, height: 3 },
    maxHealth: 400,
    generationRate: 250, // 100 elixir per hour
    capacity: 500,
  },
  [BuildingType.GOLD_STORAGE]: {
    type: BuildingType.GOLD_STORAGE,
    name: 'Gold Storage',
    description: 'Stores gold',
    category: 'resource',
    baseCost: { gold: 0, elixir: 150 },
    buildTime: 60,
    size: { width: 3, height: 3 },
    maxHealth: 600,
    capacity: 2000,
  },
  [BuildingType.ELIXIR_STORAGE]: {
    type: BuildingType.ELIXIR_STORAGE,
    name: 'Elixir Storage',
    description: 'Stores elixir',
    category: 'resource',
    baseCost: { gold: 150, elixir: 0 },
    buildTime: 60,
    size: { width: 3, height: 3 },
    maxHealth: 600,
    capacity: 2000,
  },
  [BuildingType.CANNON]: {
    type: BuildingType.CANNON,
    name: 'Cannon',
    description: 'Ground defense with medium range and damage',
    category: 'defense',
    baseCost: { gold: 400, elixir: 0 },
    buildTime: 120,
    size: { width: 2, height: 2 },
    maxHealth: 500,
    defense: {
      damage: 40,
      range: 7,
      attackSpeed: 1.5,
      targetType: 'ground',
    },
  },
  [BuildingType.ARCHER_TOWER]: {
    type: BuildingType.ARCHER_TOWER,
    name: 'Archer Tower',
    description: 'Long-range defense that targets both ground and air',
    category: 'defense',
    baseCost: { gold: 500, elixir: 0 },
    buildTime: 180,
    size: { width: 2, height: 2 },
    maxHealth: 450,
    defense: {
      damage: 25,
      range: 10,
      attackSpeed: 1.0,
      targetType: 'both',
    },
  },
  [BuildingType.WALL]: {
    type: BuildingType.WALL,
    name: 'Wall',
    description: 'Protects your village',
    category: 'defense',
    baseCost: { gold: 1, elixir: 0 },
    buildTime: 10,
    size: { width: 1, height: 1 },
    maxHealth: 300,
  },
  [BuildingType.ARMY_CAMP]: {
    type: BuildingType.ARMY_CAMP,
    name: 'Army Camp',
    description: 'Houses your troops',
    category: 'army',
    baseCost: { gold: 250, elixir: 250 },
    buildTime: 120,
    size: { width: 4, height: 4 },
    maxHealth: 600,
    capacity: 50, // troop capacity
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    name: 'Barracks',
    description: 'Train troops',
    category: 'army',
    baseCost: { gold: 200, elixir: 100 },
    buildTime: 90,
    size: { width: 3, height: 3 },
    maxHealth: 500,
  },
};

export function getBuildingConfig(type: BuildingType): BuildingConfig {
  return BUILDING_CONFIGS[type];
}

export function canAffordBuilding(
  buildingType: BuildingType,
  gold: number,
  elixir: number,
): boolean {
  const config = getBuildingConfig(buildingType);
  return gold >= config.baseCost.gold && elixir >= config.baseCost.elixir;
}
