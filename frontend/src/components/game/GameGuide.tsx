'use client';

import { useState } from 'react';
import { X, BookOpen, TrendingUp, Shield, Target, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GameGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameGuide({ isOpen, onClose }: GameGuideProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <Card className="w-full max-w-3xl border-white/20 bg-gray-900/95 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-400" />
                <CardTitle className="text-white text-2xl">How to Play Property Tycoon</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <CardContent className="space-y-6 p-0">
              {/* Game Objective */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  Game Objective
                </h3>
                <p className="text-gray-300">
                  Build your property portfolio. Earn yield from your properties. Climb the leaderboard. 
                  The player with the highest portfolio value wins.
                </p>
              </div>

              {/* How to Play */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-green-400" />
                  How to Play
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Connect your wallet and switch to Mantle Testnet</li>
                  <li>Buy TYCOON tokens (you start with 1,000,000,000 for testing)</li>
                  <li>Click "Build Property" and select a property type</li>
                  <li>Click on an empty tile on the map to place your property</li>
                  <li>Wait for yield to accumulate (properties generate yield daily)</li>
                  <li>Claim your yield to get TYCOON tokens</li>
                  <li>Use earned yield to buy more properties and expand your portfolio</li>
                </ol>
              </div>

              {/* Risk Levels */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Understanding Risk Levels
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 font-bold">Low Risk (Residential)</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Stable 5% APY. Safe investment. Perfect for beginners. Your property value stays consistent. 
                      Lower returns but reliable income.
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 font-bold">Medium Risk (Commercial)</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Balanced 8% APY. Moderate risk. Good balance between yield and stability. 
                      Property value may fluctuate slightly.
                    </p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-400 font-bold">High Risk (Industrial)</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Higher 12% APY. More volatile. Market changes affect property value more. 
                      Higher returns but less stable.
                    </p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400 font-bold">Very High Risk (Luxury)</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Maximum 15% APY. Most volatile. Property value can change significantly. 
                      Highest returns but highest risk. Best for experienced players.
                    </p>
                  </div>
                </div>
              </div>

              {/* Yield Mechanics */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Yield Mechanics
                </h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    Properties generate yield daily based on their APY rate:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Residential (5% APY): ~0.0137 TYCOON per day per property</li>
                    <li>Commercial (8% APY): ~0.0438 TYCOON per day per property</li>
                    <li>Industrial (12% APY): ~0.1644 TYCOON per day per property</li>
                    <li>Luxury (15% APY): ~0.4110 TYCOON per day per property</li>
                  </ul>
                  <p className="mt-2">
                    Yield accumulates daily. Claim anytime to receive TYCOON tokens. 
                    Use earned tokens to expand your portfolio or keep as profit.
                  </p>
                </div>
              </div>

              {/* Strategy Tips */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Strategy Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>Start with Residential properties for stable income</li>
                  <li>Diversify your portfolio across different property types</li>
                  <li>Claim yield regularly to reinvest and grow faster</li>
                  <li>Higher risk properties offer better returns but less stability</li>
                  <li>Visit other players' portfolios to learn strategies</li>
                  <li>Complete quests to earn bonus rewards</li>
                </ul>
              </div>

              <Button onClick={onClose} className="w-full mt-6">
                Got It!
              </Button>
            </CardContent>
          </div>
        </Card>
      </div>
    </>
  );
}

