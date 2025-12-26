'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { GlobalChat } from '@/components/GlobalChat';
import { MessageSquare, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { isConnected } = useAccount();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Property Tycoon</h1>
            <p className="text-sm text-gray-400">Build your real estate empire on Mantle</p>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect />
            <Button
              onClick={() => setChatOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to Property Tycoon
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Invest in properties. Earn real yield. Compete on the leaderboard.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-2">Buy Properties</h3>
                <p className="text-gray-300">Purchase residential, commercial, and luxury properties</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-2">Earn Yield</h3>
                <p className="text-gray-300">Claim daily yield from your property portfolio</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-2">Trade & Compete</h3>
                <p className="text-gray-300">Sell properties on the marketplace and climb the leaderboard</p>
              </div>
            </div>
            {isConnected && (
              <a href="/game">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6">
                  <Building2 className="w-5 h-5 mr-2" />
                  Enter Game
                </Button>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Global Chat */}
      <GlobalChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
