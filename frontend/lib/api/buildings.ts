import { apiClient } from './client';
import { Building } from './villages';

export interface PlaceBuildingRequest {
  type: string;
  positionX: number;
  positionY: number;
}

export interface MoveBuildingRequest {
  positionX: number;
  positionY: number;
}

export interface BuildingConfig {
  type: string;
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
  generationRate?: number; // per hour
  capacity?: number; // max storage
  defense?: {
    damage: number;
    range: number;
    attackSpeed: number;
    targetType: 'ground' | 'air' | 'both';
  };
}

export const buildingsApi = {
  getBuildingConfigs: async (): Promise<Record<string, BuildingConfig>> => {
    const response = await apiClient.get<Record<string, BuildingConfig>>('/buildings/configs');
    return response.data;
  },

  placeBuilding: async (data: PlaceBuildingRequest): Promise<{ message: string; building: Building }> => {
    const response = await apiClient.post<{ message: string; building: Building }>(
      '/buildings/place',
      data,
    );
    return response.data;
  },

  moveBuilding: async (
    buildingId: string,
    data: MoveBuildingRequest,
  ): Promise<{ message: string; building: Building }> => {
    const response = await apiClient.put<{ message: string; building: Building }>(
      `/buildings/${buildingId}/move`,
      data,
    );
    return response.data;
  },

  deleteBuilding: async (buildingId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/buildings/${buildingId}`);
    return response.data;
  },
};
