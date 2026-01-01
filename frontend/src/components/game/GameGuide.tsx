'use client'

import { X, BookOpen, Wallet, Coins, Building2, TrendingUp, Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GameGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function GameGuide({ isOpen, onClose }: GameGuideProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-white/20 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-gray-900 border-b border-white/10 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            How to Play Property Tycoon
          </CardTitle>
          <Button onClick={onClose} variant="ghost" size="sm" className="text-white">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Wallet className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 1: Connect Your Wallet</h3>
                <p className="text-gray-300">
                  Connect your MetaMask or WalletConnect wallet. Make sure you're on Mantle Testnet. Get test tokens from the faucet if needed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Coins className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 2: Buy TYCOON Tokens</h3>
                <p className="text-gray-300">
                  Buy TYCOON tokens with MNT. One MNT buys 100 TYCOON tokens. This is a one-time purchase to get started. Buy enough for your first property.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 3: Mint Your Property</h3>
                <p className="text-gray-300">
                  Spend TYCOON tokens to mint property NFTs. Choose from Residential (100 tokens), Commercial (200 tokens), Industrial (500 tokens), or Luxury (1000 tokens). Each property generates yield daily.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 4: Collect Yield</h3>
                <p className="text-gray-300">
                  Properties generate yield daily. Claim your yield rewards as USDC or USDT. Real money in your wallet. Keep the yield or reinvest to expand your portfolio.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Trophy className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 5: Compete & Trade</h3>
                <p className="text-gray-300">
                  View the leaderboard to see top tycoons. Visit other players' portfolios. Trade properties on the marketplace. Join guilds. Complete quests for bonus rewards.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Step 6: Build Your Empire</h3>
                <p className="text-gray-300">
                  Expand your portfolio. Link properties to RWA for real yield. Complete investment quests. Climb the leaderboard. Build the ultimate property empire.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <h4 className="font-semibold text-blue-400 mb-2">Property Types & Costs</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Residential: 100 TYCOON tokens - 5% APY</li>
              <li>• Commercial: 200 TYCOON tokens - 8% APY</li>
              <li>• Industrial: 500 TYCOON tokens - 12% APY</li>
              <li>• Luxury: 1000 TYCOON tokens - 15% APY</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}







