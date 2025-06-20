import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import '@rainbow-me/rainbowkit/styles.css'
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'

import {
  WagmiProvider,
  createConfig,
  http,
} from 'wagmi'

import { sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { connectors } = getDefaultWallets({
  appName: 'FileStorage',
  projectId: '22ea5156ffe0626d75227fbc4c5b1731', // Replace with actual WalletConnect project ID
  chains: [sepolia],
})

// Updated config for wagmi v2
const config = createConfig({
  autoConnect: true,
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(), // Uses the default public RPC
  },
})

// Required for wagmi v2
const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider chains={[sepolia]}>
          <App />
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>
)