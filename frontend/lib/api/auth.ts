import { apiClient } from './client';



export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    walletAddress?: string; // Optional for backward compatibility
    email?: string; // Optional for backward compatibility
  };
}

export interface User {
  userId: string;
  username: string;
  walletAddress?: string;
  email?: string;
  createdAt?: string;
}

export interface SiweVerifyData {
  message: string;
  signature: string;
  walletAddress: string;
}

export const authApi = {


  // SIWE Authentication
  getNonce: async (walletAddress: string): Promise<{ nonce: string }> => {
    const response = await apiClient.post<{ nonce: string }>('/auth/nonce', {
      walletAddress,
    });
    return response.data;
  },

  verifySiwe: async (data: SiweVerifyData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/siwe/verify', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  updateUsername: async (username: string): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/username', { username });
    return response.data;
  },
};
