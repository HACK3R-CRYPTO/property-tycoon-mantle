import { apiClient } from './client';

export interface BattleResult {
  id: string;
  destructionPercentage: number;
  stars: number;
  lootGold: number;
  lootElixir: number;
  createdAt: string;
}

export interface BattleDetails extends BattleResult {
  attackerId: string;
  defenderId: string;
  attackerTroops: { type: string; count: number }[];
  battleLog: BattleEvent[];
}

export interface BattleEvent {
  timestamp: number;
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED';
  data: any;
}

export interface OpponentVillage {
  opponentVillageId: string;
  message: string;
}

export interface BattleBuilding {
  id: string;
  type: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
}

export interface BattleSession {
  battleId: string;
  session: {
    id: string;
    status: string;
    buildings: BattleBuilding[];
    maxTroops: number;
  };
  troops?: { type: string; count: number }[]; // Troops from battle record for rejoining
}

export interface PublicBattle {
  id: string;
  attackerVillage: {
    id: string;
    name: string;
  };
  defenderVillage: {
    id: string;
    name: string;
  };
  attackerTroops: { type: string; count: number }[];
  destructionPercentage: number;
  stars: number;
  lootGold: number;
  lootElixir: number;
  status: string;
  createdAt: string;
}

export const battlesApi = {
  /**
   * Get recent battles (public, no auth required)
   */
  getRecentBattles: async (limit: number = 50): Promise<{ battles: PublicBattle[] }> => {
    const response = await apiClient.get('/battles/public/recent', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Find a random opponent to attack
   */
  findOpponent: async (): Promise<OpponentVillage> => {
    const response = await apiClient.get('/battles/find-opponent');
    return response.data;
  },

  /**
   * Start a real-time battle session (Phase 6)
   */
  startBattle: async (
    defenderId: string,
    troops: { type: string; count: number }[],
  ): Promise<BattleSession> => {
    const response = await apiClient.post('/battles/start', {
      defenderId,
      troops,
    });
    return response.data;
  },

  /**
   * Execute an attack against an opponent (Phase 5 instant simulation)
   */
  attack: async (
    defenderId: string,
    troops: { type: string; count: number }[],
  ): Promise<{ message: string; battle: BattleResult }> => {
    const response = await apiClient.post('/battles/attack', {
      defenderId,
      troops,
    });
    return response.data;
  },

  /**
   * Get battle details by ID
   */
  getBattle: async (battleId: string): Promise<{ battle: BattleDetails }> => {
    const response = await apiClient.get(`/battles/${battleId}`);
    return response.data;
  },

  /**
   * Get battle history (attacks made by user)
   */
  getHistory: async (limit: number = 20): Promise<{ battles: BattleResult[] }> => {
    const response = await apiClient.get('/battles', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get defense history (attacks against user's village)
   */
  getDefenses: async (limit: number = 20): Promise<{ battles: BattleResult[] }> => {
    const response = await apiClient.get('/battles/defenses', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get user's active battles (ongoing battles they can rejoin)
   */
  getActiveBattles: async (): Promise<{ battles: PublicBattle[] }> => {
    const response = await apiClient.get('/battles/active');
    return response.data;
  },

  /**
   * Get battle session by session ID (for rejoining)
   */
  getBattleSession: async (sessionId: string): Promise<BattleSession> => {
    const response = await apiClient.get(`/battles/session/${sessionId}`);
    return response.data;
  },

  /**
   * Deploy a troop during an active battle (REST API)
   */
  deployTroop: async (
    battleId: string,
    troopType: string,
    position: { x: number; y: number },
  ): Promise<{ message: string; troop: { id: string; type: string; position: { x: number; y: number } } }> => {
    const response = await apiClient.post(`/battles/${battleId}/deploy`, {
      troopType,
      position,
    });
    return response.data;
  },
};
