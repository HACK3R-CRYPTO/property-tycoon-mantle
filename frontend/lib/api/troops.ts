import { apiClient } from './client';

export interface TroopStats {
  type: string;
  name: string;
  description: string;
  health: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  range: number;
  housingSpace: number;
  trainingTime: number;
  cost: {
    elixir: number;
  };
  targetPreference: 'ANY' | 'DEFENSES' | 'WALLS';
  icon: string;
}

export interface TrainingQueueItem {
  id: string;
  villageId: string;
  troopType: string;
  startedAt: string;
  completesAt: string;
  cost: number;
  queuePosition: number;
  createdAt: string;
  troopConfig: TroopStats;
}

export interface ArmyTroop {
  id: string;
  villageId: string;
  troopType: string;
  count: number;
  createdAt: string;
  updatedAt: string;
  troopConfig: TroopStats;
}

export const troopsApi = {
  // Get all available troop types
  getAvailableTroops: async (): Promise<TroopStats[]> => {
    const response = await apiClient.get('/troops/available');
    return response.data;
  },

  // Train a new troop
  trainTroop: async (troopType: string) => {
    const response = await apiClient.post('/troops/train', { troopType });
    return response.data;
  },

  // Get training queue
  getTrainingQueue: async (): Promise<TrainingQueueItem[]> => {
    const response = await apiClient.get('/troops/queue');
    return response.data;
  },

  // Get user's army
  getArmy: async (): Promise<ArmyTroop[]> => {
    const response = await apiClient.get('/troops/army');
    return response.data;
  },

  // Cancel a training
  cancelTraining: async (trainingId: string) => {
    const response = await apiClient.delete(`/troops/queue/${trainingId}`);
    return response.data;
  },
};
