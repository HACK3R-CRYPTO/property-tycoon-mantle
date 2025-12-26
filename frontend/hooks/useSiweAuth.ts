'use client';

import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores';
import { useState } from 'react';

/**
 * Hook for SIWE (Sign-In with Ethereum) authentication
 * Handles the complete flow: nonce generation, message signing, and verification
 */
export function useSiweAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { loginWithToken } = useAuthStore();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    if (!address || !isConnected) {
      throw new Error('No wallet connected');
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // 1. Get nonce from backend
      const { nonce } = await authApi.getNonce(address);

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Clash on Somnia',
        uri: window.location.origin,
        version: '1',
        chainId: 50312, // Somnia testnet
        nonce,
      });

      const preparedMessage = message.prepareMessage();

      // 3. Sign message with wallet
      const signature = await signMessageAsync({
        message: preparedMessage,
      });

      // 4. Verify signature with backend
      const { accessToken, user } = await authApi.verifySiwe({
        message: preparedMessage,
        signature,
        walletAddress: address,
      });

      // 5. Store token and update auth state
      loginWithToken(accessToken, user);

      return { success: true, user };
    } catch (err: any) {
      const errorMessage = err?.message || 'Authentication failed';
      setError(errorMessage);
      console.error('SIWE authentication error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    authenticate,
    isAuthenticating,
    error,
    isConnected,
    address,
  };
}
