import { createConfig, http } from 'wagmi';
import { mantle, mantleSepoliaTestnet } from '@mantleio/viem/chains';
import { walletConnect } from 'wagmi/connectors';

// Determine which chain to use based on environment
const chain = process.env.NEXT_PUBLIC_MANTLE_NETWORK === 'testnet' 
  ? mantleSepoliaTestnet 
  : mantle;

// WalletConnect project ID (get from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create Wagmi config with Mantle Viem
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    // MetaMask is handled by Reown AppKit, no need for direct connector
    walletConnect({ projectId }),
  ],
  transports: {
    [chain.id]: http(process.env.NEXT_PUBLIC_MANTLE_RPC_URL || 'https://rpc.mantle.xyz'),
  },
  ssr: true,
});

// Export chain info for use in components
export { chain, mantle, mantleSepoliaTestnet };

// Helper to get chain config
export function getChainConfig() {
  return {
    id: chain.id,
    name: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: {
      default: {
        http: [chain.rpcUrls.default.http[0]],
      },
    },
    blockExplorers: {
      default: {
        name: chain.blockExplorers?.default?.name || 'Mantle Explorer',
        url: chain.blockExplorers?.default?.url || 'https://mantlescan.xyz',
      },
    },
  };
}

