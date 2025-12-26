import { create } from 'zustand';
import { villagesApi, type Village, type Building, type Resources } from '../api';

interface VillageState {
  village: Village | null;
  isLoading: boolean;
  error: string | null;
  fetchVillage: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  updateResources: (gold: number, elixir: number) => void;
  addBuilding: (building: Building) => void;
  removeBuilding: (buildingId: string) => void;
  updateBuilding: (buildingId: string, updates: Partial<Building>) => void;
  clearError: () => void;
  reset: () => void;
}

export const useVillageStore = create<VillageState>((set, get) => ({
  village: null,
  isLoading: false,
  error: null,

  fetchVillage: async () => {
    try {
      set({ isLoading: true, error: null });
      const village = await villagesApi.getMyVillage();
      set({ village, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch village',
        isLoading: false,
      });
    }
  },

  silentRefresh: async () => {
    try {
      // Fetch without triggering loading state to prevent re-renders
      const village = await villagesApi.getMyVillage();
      const currentVillage = get().village;

      // Only update if there are actual changes to buildings (collector internal storage)
      if (currentVillage) {
        const buildingsChanged = JSON.stringify(village.buildings) !== JSON.stringify(currentVillage.buildings);
        if (buildingsChanged) {
          set({ village });
        }
      }
    } catch (error: any) {
      // Silent fail - don't update error state during background refresh
      console.error('Silent refresh failed:', error);
    }
  },

  updateResources: (gold: number, elixir: number) => {
    const { village } = get();
    if (village && village.resources) {
      set({
        village: {
          ...village,
          resources: {
            ...village.resources,
            gold,
            elixir,
          },
        },
      });
    }
  },

  addBuilding: (building: Building) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: [...village.buildings, building],
        },
      });
    }
  },

  removeBuilding: (buildingId: string) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: village.buildings.filter((b) => b.id !== buildingId),
        },
      });
    }
  },

  updateBuilding: (buildingId: string, updates: Partial<Building>) => {
    const { village } = get();
    if (village) {
      set({
        village: {
          ...village,
          buildings: village.buildings.map((b) => (b.id === buildingId ? { ...b, ...updates } : b)),
        },
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ village: null, isLoading: false, error: null }),
}));
