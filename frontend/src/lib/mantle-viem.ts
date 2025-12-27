import { createConfig, http, fallback } from 'wagmi';
import { mantle, mantleSepoliaTestnet } from '@mantleio/viem/chains';
import { walletConnect } from 'wagmi/connectors';

// Determine which chain to use based on environment
const chain = process.env.NEXT_PUBLIC_MANTLE_NETWORK === 'testnet' 
  ? mantleSepoliaTestnet 
  : mantle;

// WalletConnect project ID (get from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// RPC URLs with fallbacks (official RPC has rate limiting)
const getRpcUrls = (chainId: number) => {
  const customUrl = process.env.NEXT_PUBLIC_MANTLE_RPC_URL;
  if (customUrl && chainId === 5003) return [customUrl];
  
  if (chainId === 5003) {
    // Mantle Sepolia Testnet - use official + fallbacks
    return [
      'https://rpc.sepolia.mantle.xyz', // Official (may have rate limiting)
      'https://mantle-sepolia.drpc.org', // DRPC fallback
      'https://rpc.ankr.com/mantle_sepolia', // Ankr fallback
    ];
  } else {
    // Mantle Mainnet (5000)
    return [
      'https://rpc.mantle.xyz', // Official
      'https://mantle.drpc.org', // DRPC fallback
    ];
  }
};

// Create Wagmi config with Mantle Viem
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    // MetaMask is handled by Reown AppKit, no need for direct connector
    walletConnect({ projectId }),
  ],
  transports: {
    [mantle.id]: fallback(getRpcUrls(mantle.id).map(url => http(url))),
    [mantleSepoliaTestnet.id]: fallback(getRpcUrls(mantleSepoliaTestnet.id).map(url => http(url))),
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

