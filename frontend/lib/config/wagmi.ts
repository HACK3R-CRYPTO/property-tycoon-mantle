'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

/**
 * Somnia Testnet chain configuration
 */
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://dream-rpc.somnia.network/ws'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://dream-rpc.somnia.network/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia.network/explorer',
    },
  },
  testnet: true,
} as const);

/**
 * Wagmi configuration for Clash on Somnia
 * Supports only Somnia Testnet
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'Clash on Somnia',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'test', // Fallback to 'test' if env var is missing
  chains: [somniaTestnet],
  ssr: true, // Enable server-side rendering for Next.js
});
