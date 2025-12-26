import { create } from 'zustand';
import { authApi, type User } from '../api';
import { useVillageStore } from './useVillageStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithToken: (token: string, user: any) => void; // For SIWE authentication
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start as true to prevent redirect during initial auth check
  error: null,



  // SIWE login - directly set token and user
  loginWithToken: (token: string, user: any) => {
    localStorage.setItem('auth_token', token);
    useVillageStore.getState().reset();
    set({
      user: {
        userId: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        email: user.email,
      },
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },



  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
    // Clear village store on logout
    useVillageStore.getState().reset();
  },

  loadUser: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await authApi.getMe();
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUsername: async (username: string) => {
    try {
      const updatedUser = await authApi.updateUsername(username);
      set((state) => ({
        user: state.user ? { ...state.user, username: updatedUser.username } : null,
      }));
    } catch (error: any) {
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
