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
  size: {
    width: number;
    height: number;
  };
  color: string;
  generationRate?: number;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.TOWN_HALL]: {
    type: BuildingType.TOWN_HALL,
    name: 'Town Hall',
    description: 'The heart of your village',
    category: 'special',
    baseCost: { gold: 0, elixir: 0 },
    size: { width: 4, height: 4 },
    color: '#FFD700',
  },
  [BuildingType.GOLD_MINE]: {
    type: BuildingType.GOLD_MINE,
    name: 'Gold Mine',
    description: 'Generates gold over time',
    category: 'resource',
    baseCost: { gold: 150, elixir: 0 },
    size: { width: 3, height: 3 },
    color: '#DAA520',
    generationRate: 100,
  },
  [BuildingType.ELIXIR_COLLECTOR]: {
    type: BuildingType.ELIXIR_COLLECTOR,
    name: 'Elixir Collector',
    description: 'Generates elixir over time',
    category: 'resource',
    baseCost: { gold: 0, elixir: 150 },
    size: { width: 3, height: 3 },
    color: '#9B30FF',
    generationRate: 100,
  },
  [BuildingType.GOLD_STORAGE]: {
    type: BuildingType.GOLD_STORAGE,
    name: 'Gold Storage',
    description: 'Stores gold',
    category: 'resource',
    baseCost: { gold: 300, elixir: 0 },
    size: { width: 3, height: 3 },
    color: '#B8860B',
  },
  [BuildingType.ELIXIR_STORAGE]: {
    type: BuildingType.ELIXIR_STORAGE,
    name: 'Elixir Storage',
    description: 'Stores elixir',
    category: 'resource',
    baseCost: { gold: 0, elixir: 300 },
    size: { width: 3, height: 3 },
    color: '#6A0DAD',
  },
  [BuildingType.CANNON]: {
    type: BuildingType.CANNON,
    name: 'Cannon',
    description: 'Ground defense',
    category: 'defense',
    baseCost: { gold: 400, elixir: 0 },
    size: { width: 2, height: 2 },
    color: '#708090',
  },
  [BuildingType.ARCHER_TOWER]: {
    type: BuildingType.ARCHER_TOWER,
    name: 'Archer Tower',
    description: 'Ranged defense',
    category: 'defense',
    baseCost: { gold: 500, elixir: 0 },
    size: { width: 2, height: 2 },
    color: '#A9A9A9',
  },
  [BuildingType.WALL]: {
    type: BuildingType.WALL,
    name: 'Wall',
    description: 'Protects your village',
    category: 'defense',
    baseCost: { gold: 50, elixir: 0 },
    size: { width: 1, height: 1 },
    color: '#8B4513',
  },
  [BuildingType.ARMY_CAMP]: {
    type: BuildingType.ARMY_CAMP,
    name: 'Army Camp',
    description: 'Houses your troops',
    category: 'army',
    baseCost: { gold: 250, elixir: 250 },
    size: { width: 4, height: 4 },
    color: '#CD5C5C',
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    name: 'Barracks',
    description: 'Train troops',
    category: 'army',
    baseCost: { gold: 200, elixir: 100 },
    size: { width: 3, height: 3 },
    color: '#DC143C',
  },
};

export function getBuildingConfig(type: BuildingType): BuildingConfig {
  return BUILDING_CONFIGS[type];
}
