'use client'

import { wagmiAdapter, projectId } from '@/config'
import { createAppKit } from '@reown/appkit/react' 
import { mantle, mantleSepoliaTestnet } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

const metadata = {
  name: "Property Tycoon - Mantle",
  description: "Property Tycoon - Real estate investment game on Mantle Network",
  url: "https://propertytycoon.com", // Replace with your actual domain
  icons: ["https://avatars.githubusercontent.com/u/179229932"] // Replace with your app icon
}

const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mantle, mantleSepoliaTestnet],
  metadata: metadata,
  features: {
    analytics: true,
  },
  themeMode: 'dark' // Set theme to dark to match game UI
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  // Safely parse cookies - handle null or empty strings
  let initialState;
  try {
    initialState = cookies ? cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies) : undefined;
  } catch (error) {
    console.warn('Failed to parse cookies for wagmi initialState:', error);
    initialState = undefined;
  }
  
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider

