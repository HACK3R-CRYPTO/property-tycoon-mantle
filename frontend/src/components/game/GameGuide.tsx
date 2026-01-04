'use client'

import { X, Building2, Coins, TrendingUp, Trophy, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface GameGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function GameGuide({ isOpen, onClose }: GameGuideProps) {
  const [floatingElements, setFloatingElements] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    if (isOpen) {
      // Create floating property icons
      const elements = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
      }))
      setFloatingElements(elements)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* Floating Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((el) => (
          <div
            key={el.id}
            className="absolute animate-float"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              animationDelay: `${el.delay}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          >
            <Building2 className="w-6 h-6 text-emerald-500/20" />
          </div>
        ))}
      </div>

      {/* Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Content */}
      <div 
        className="relative bg-gray-900/95 border-2 border-emerald-500/50 rounded-lg w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2 uppercase" style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}>
            HOW TO PLAY
          </h2>
          <div className="w-20 h-0.5 bg-emerald-500 mx-auto"></div>
        </div>

        {/* Simple Steps - More Compact */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>1</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>CONNECT WALLET</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>GET STARTED WITH METAMASK OR WALLETCONNECT</p>
            </div>
            <Building2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>2</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>BUY TYCOON TOKENS</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>1 MNT = 100 TYCOON TOKENS</p>
            </div>
            <Coins className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>3</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>MINT PROPERTIES</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>RESIDENTIAL • COMMERCIAL • INDUSTRIAL • LUXURY</p>
            </div>
            <Building2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>4</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>LINK TO RWA [OPTIONAL]</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>CONNECT TO REAL-WORLD ASSETS FOR HIGHER YIELD</p>
            </div>
            <Link2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>5</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>EARN YIELD DAILY</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>CLAIM TYC REWARDS EVERY 24 HOURS</p>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>6</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm uppercase mb-0.5" style={{ fontFamily: 'monospace' }}>BUILD YOUR EMPIRE</p>
              <p className="text-gray-400 text-xs uppercase" style={{ fontFamily: 'monospace' }}>TRADE • COMPETE • AND CLIMB THE LEADERBOARD</p>
            </div>
            <Trophy className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>
        </div>

        {/* Property Types Quick Reference - More Compact */}
        <div className="mt-6 p-3 bg-black/40 border border-emerald-500/20 rounded">
          <p className="text-emerald-400 font-semibold text-xs mb-2 text-center uppercase" style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}>
            PROPERTY TYPES
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 uppercase" style={{ fontFamily: 'monospace' }}>
            <div>RESIDENTIAL: 100 TYC • 5% APY</div>
            <div>COMMERCIAL: 200 TYC • 8% APY</div>
            <div>INDUSTRIAL: 500 TYC • 12% APY</div>
            <div>LUXURY: 1000 TYC • 15% APY</div>
          </div>
        </div>
      </div>
    </div>
  )
}
