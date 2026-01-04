'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Building2, Zap, BookOpen, Coins, TrendingUp } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';
import { GameGuide } from '@/components/game/GameGuide';
import Link from 'next/link';

export default function Home() {
  const { isConnected } = useAccount();
  const [showGuide, setShowGuide] = useState(false);
  const [floatingElements, setFloatingElements] = useState<Array<{ id: number; x: number; y: number; delay: number; icon: 'building' | 'coin' | 'trend' }>>([]);

  useEffect(() => {
    // Create floating animated elements (like Noodle Quest's macaroni)
    const elements = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      icon: ['building', 'coin', 'trend'][Math.floor(Math.random() * 3)] as 'building' | 'coin' | 'trend',
    }));
    setFloatingElements(elements);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
      <div className="fixed inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-blue-900/20" />

      {/* Grid Background Pattern */}
      <div 
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating Animated Elements (like Noodle Quest's macaroni) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((el) => (
          <div
            key={el.id}
            className="absolute animate-float"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              animationDelay: `${el.delay}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            {el.icon === 'building' && <Building2 className="w-6 h-6 text-emerald-500/20" />}
            {el.icon === 'coin' && <Coins className="w-6 h-6 text-emerald-500/20" />}
            {el.icon === 'trend' && <TrendingUp className="w-6 h-6 text-emerald-500/20" />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
            PROPERTY TYCOON
          </h1>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm mb-8">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
            Powered by Mantle Blockchain
          </span>
        </div>

        {/* Main Title */}
        <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="block bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
            BUILD YOUR EMPIRE
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-12">
          Earn real yield from RWA-backed properties
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
          {isConnected ? (
            <>
              <button
                onClick={() => setShowGuide(true)}
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <BookOpen className="w-5 h-5" />
                HOW TO PLAY
              </button>
              <Link
                href="/game"
                className="group relative px-10 py-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold text-xl transition-all duration-300 hover:scale-105 shadow-2xl shadow-emerald-500/50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <span className="relative flex items-center gap-3">
                  <Building2 className="w-6 h-6" />
                  START PLAYING
                </span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowGuide(true)}
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <BookOpen className="w-5 h-5" />
                HOW TO PLAY
              </button>
              <WalletConnect />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-8 left-0 right-0 text-center z-10">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Property Tycoon. All rights reserved.
        </p>
      </div>

      {/* Game Guide Modal */}
      <GameGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
