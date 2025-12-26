import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BattleSession } from '@/lib/api/battles';

interface BattleState {
  battleSession: BattleSession | null;
  selectedTroops: { type: string; count: number }[];
  setBattleSession: (session: BattleSession | null) => void;
  setSelectedTroops: (troops: { type: string; count: number }[]) => void;
  clearBattle: () => void;
  loadFromStorage: () => void;
}

export const useBattleStore = create<BattleState>()(
  persist(
    (set, get) => ({
      battleSession: null,
      selectedTroops: [],
      setBattleSession: (session) => {
        set({ battleSession: session });
        // Also store session ID separately for quick access
        if (session) {
          localStorage.setItem('currentBattleId', session.session.id);
        } else {
          localStorage.removeItem('currentBattleId');
        }
      },
      setSelectedTroops: (troops) => set({ selectedTroops: troops }),
      clearBattle: () => {
        set({ battleSession: null, selectedTroops: [] });
        localStorage.removeItem('currentBattleId');
      },
      loadFromStorage: () => {
        // Method to manually trigger load from storage
        // Zustand persist will auto-hydrate on init
      },
    }),
    {
      name: 'battle-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        battleSession: state.battleSession,
        selectedTroops: state.selectedTroops,
      }),
    }
  )
);
