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

export interface BuildingVisualConfig {
  type: BuildingType;
  name: string;
  color: string; // Placeholder color until we have sprites
  size: {
    width: number;
    height: number;
  };
}

export const BUILDING_VISUALS: Record<BuildingType, BuildingVisualConfig> = {
  [BuildingType.TOWN_HALL]: {
    type: BuildingType.TOWN_HALL,
    name: 'Town Hall',
    color: '#FFD700', // Gold
    size: { width: 4, height: 4 },
  },
  [BuildingType.GOLD_MINE]: {
    type: BuildingType.GOLD_MINE,
    name: 'Gold Mine',
    color: '#DAA520', // Goldenrod
    size: { width: 3, height: 3 },
  },
  [BuildingType.ELIXIR_COLLECTOR]: {
    type: BuildingType.ELIXIR_COLLECTOR,
    name: 'Elixir Collector',
    color: '#9B30FF', // Purple
    size: { width: 3, height: 3 },
  },
  [BuildingType.GOLD_STORAGE]: {
    type: BuildingType.GOLD_STORAGE,
    name: 'Gold Storage',
    color: '#B8860B', // Dark goldenrod
    size: { width: 3, height: 3 },
  },
  [BuildingType.ELIXIR_STORAGE]: {
    type: BuildingType.ELIXIR_STORAGE,
    name: 'Elixir Storage',
    color: '#6A0DAD', // Dark purple
    size: { width: 3, height: 3 },
  },
  [BuildingType.CANNON]: {
    type: BuildingType.CANNON,
    name: 'Cannon',
    color: '#708090', // Slate gray
    size: { width: 2, height: 2 },
  },
  [BuildingType.ARCHER_TOWER]: {
    type: BuildingType.ARCHER_TOWER,
    name: 'Archer Tower',
    color: '#A9A9A9', // Dark gray
    size: { width: 2, height: 2 },
  },
  [BuildingType.WALL]: {
    type: BuildingType.WALL,
    name: 'Wall',
    color: '#8B4513', // Saddle brown
    size: { width: 1, height: 1 },
  },
  [BuildingType.ARMY_CAMP]: {
    type: BuildingType.ARMY_CAMP,
    name: 'Army Camp',
    color: '#CD5C5C', // Indian red
    size: { width: 4, height: 4 },
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    name: 'Barracks',
    color: '#DC143C', // Crimson
    size: { width: 3, height: 3 },
  },
};

export function getBuildingVisual(type: string): BuildingVisualConfig {
  return BUILDING_VISUALS[type as BuildingType] || BUILDING_VISUALS[BuildingType.TOWN_HALL];
}
