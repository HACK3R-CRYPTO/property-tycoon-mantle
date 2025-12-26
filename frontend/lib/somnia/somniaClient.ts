import { SDK as SomniaStreamSDK } from '@somnia-chain/streams';
import { createPublicClient, defineChain, http } from 'viem';
import { mainnet } from 'viem/chains';

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL_SOMNIA || ''] },
    public:  { http: [process.env.RPC_URL_SOMNIA || ''] },
  },
} as const)

// Initialize Public Client (Read-only)
export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://dream-rpc.somnia.network'),
});

// Initialize Somnia SDK
export const somniaSdk = new SomniaStreamSDK({
  public: publicClient
});

// Constants
// This must match the schema string in the backend
export const CHAT_SCHEMA = 'uint64 timestamp, string sender, string content, string avatar';
// CHAT_SCHEMA_ID is computed asynchronously in the hook

// The backend's wallet address (Publisher)
// TODO: This should be an environment variable or fetched from an API
// For now, we'll need to manually set this after the backend runs and logs its address
// OR we can derive it if we know the public key.
// Let's assume we'll get it from an env var for now.
export const PUBLISHER_ADDRESS = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS;
