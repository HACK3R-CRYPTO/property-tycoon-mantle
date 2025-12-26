import { create } from 'zustand';
import { FloatingNumberData } from '@/components/ui/FloatingNumber';

interface FloatingNumberState {
  numbers: FloatingNumberData[];
  addNumber: (number: Omit<FloatingNumberData, 'id'>) => void;
  removeNumber: (id: string) => void;
  showDamage: (x: number, y: number, value: number) => void;
  showHeal: (x: number, y: number, value: number) => void;
  showGold: (x: number, y: number, value: number) => void;
  showElixir: (x: number, y: number, value: number) => void;
  showTrophy: (x: number, y: number, value: number) => void;
}

export const useFloatingNumberStore = create<FloatingNumberState>((set) => ({
  numbers: [],

  addNumber: (number) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    set((state) => ({
      numbers: [...state.numbers, { ...number, id }],
    }));
  },

  removeNumber: (id) => {
    set((state) => ({
      numbers: state.numbers.filter((n) => n.id !== id),
    }));
  },

  showDamage: (x, y, value) => {
    useFloatingNumberStore.getState().addNumber({ x, y, value, type: 'damage' });
  },

  showHeal: (x, y, value) => {
    useFloatingNumberStore.getState().addNumber({ x, y, value, type: 'heal' });
  },

  showGold: (x, y, value) => {
    useFloatingNumberStore.getState().addNumber({ x, y, value, type: 'gold' });
  },

  showElixir: (x, y, value) => {
    useFloatingNumberStore.getState().addNumber({ x, y, value, type: 'elixir' });
  },

  showTrophy: (x, y, value) => {
    useFloatingNumberStore.getState().addNumber({ x, y, value, type: 'trophy' });
  },
}));
