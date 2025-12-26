'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useSiweAuth } from '@/hooks/useSiweAuth';
import { useAuthStore } from '@/lib/stores';
import { useEffect } from 'react';

/**
 * Wallet Connect Button with automatic SIWE authentication
 * When wallet connects, automatically triggers SIWE flow
 */
export function WalletConnectButton() {
  const { isConnected, address } = useAccount();
  const { authenticate, isAuthenticating } = useSiweAuth();
  const { isAuthenticated } = useAuthStore();

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isAuthenticating) {
      authenticate();
    }
  }, [isConnected, address, isAuthenticated, isAuthenticating, authenticate]);

  return (
    <div className="relative">
      <ConnectButton
        chainStatus="icon"
        showBalance={false}
        accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'full',
        }}
      />
      {isAuthenticating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
