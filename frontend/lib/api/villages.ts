import { apiClient } from './client';

export interface Building {
  id: string;
  villageId: string;
  type: string;
  level: number;
  positionX: number;
  positionY: number;
  health: number;
  maxHealth: number;
  isActive: boolean;
  internalGold: number;
  internalElixir: number;
  internalGoldCapacity: number;
  internalElixirCapacity: number;
  lastCollectedAt: string;
  constructionCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resources {
  id: string;
  villageId: string;
  gold: number;
  elixir: number;
  lastCollectedAt: string;
  updatedAt: string;
}

export interface Village {
  id: string;
  userId: string;
  name: string;
  trophies: number;
  createdAt: string;
  updatedAt: string;
  resources: Resources;
  buildings: Building[];
}

export interface ResourcesWithPending extends Resources {
  pending: {
    gold: number;
    elixir: number;
  };
  capacity: {
    gold: number;
    elixir: number;
  };
}

export const villagesApi = {
  getMyVillage: async (): Promise<Village> => {
    const response = await apiClient.get<Village>('/villages/me');
    return response.data;
  },
};

export const resourcesApi = {
  getMyResources: async (): Promise<ResourcesWithPending> => {
    const response = await apiClient.get<ResourcesWithPending>('/resources/me');
    return response.data;
  },

  collectResources: async (): Promise<{ message: string; resources: Resources }> => {
    const response = await apiClient.post<{ message: string; resources: Resources }>(
      '/resources/collect',
    );
    return response.data;
  },

  collectFromBuilding: async (
    buildingId: string,
  ): Promise<{
    message: string;
    building: Building;
    resources: Resources;
    collected: { gold: number; elixir: number };
  }> => {
    const response = await apiClient.post(`/resources/collect/${buildingId}`);
    return response.data;
  },
};
