'use client'

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mantle, mantleSepoliaTestnet } from '@reown/appkit/networks'

// Get project ID from environment variable
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Create Reown AppKit Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  networks: [mantle, mantleSepoliaTestnet],
  projectId,
})

