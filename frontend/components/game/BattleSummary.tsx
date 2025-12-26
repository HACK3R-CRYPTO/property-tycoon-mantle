'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, Trophy, Coins, Droplet, Clock, Home, Award } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface BattleSummaryProps {
  battleResult: {
    destructionPercentage: number;
    stars: number;
    duration: number;
    lootGold?: number;
    lootElixir?: number;
  };
  onReturnToVillage: () => void;
}

export function BattleSummary({ battleResult, onReturnToVillage }: BattleSummaryProps) {
  const [showStars, setShowStars] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLoot, setShowLoot] = useState(false);

  const isVictory = battleResult.stars > 0;
  const durationSeconds = Math.floor(battleResult.duration / 1000);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  useEffect(() => {
    // Staggered animations
    setTimeout(() => setShowStars(true), 300);
    setTimeout(() => setShowStats(true), 800);
    setTimeout(() => setShowLoot(true), 1200);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-4 border-yellow-500 shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Victory/Defeat Header */}
          <div className="text-center space-y-2">
            <div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
                isVictory
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                  : 'bg-gradient-to-r from-red-600 to-red-800'
              } shadow-lg transform transition-all duration-500 ${showStars ? 'scale-100' : 'scale-0'}`}
            >
              {isVictory ? (
                <>
                  <Trophy className="w-8 h-8 text-white animate-bounce" />
                  <h2 className="text-3xl font-bold text-white">VICTORY!</h2>
                  <Trophy className="w-8 h-8 text-white animate-bounce" />
                </>
              ) : (
                <>
                  <Award className="w-8 h-8 text-white" />
                  <h2 className="text-3xl font-bold text-white">DEFEAT</h2>
                </>
              )}
            </div>
          </div>

          {/* Stars Display */}
          <div
            className={`flex justify-center gap-4 transition-all duration-500 ${
              showStars ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {[1, 2, 3].map((star) => (
              <div
                key={star}
                className={`relative ${star <= battleResult.stars ? 'animate-pulse' : ''}`}
                style={{
                  animationDelay: `${star * 200}ms`,
                }}
              >
                <Star
                  className={`w-16 h-16 ${
                    star <= battleResult.stars
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-600 fill-gray-700'
                  } drop-shadow-lg transition-all duration-300`}
                />
              </div>
            ))}
          </div>

          {/* Battle Stats */}
          <div
            className={`grid grid-cols-2 gap-4 transition-all duration-500 ${
              showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Destruction */}
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <Trophy className="w-4 h-4" />
                  <span>Destruction</span>
                </div>
                <div className="text-4xl font-bold text-yellow-400">
                  {battleResult.destructionPercentage}%
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000"
                    style={{ width: `${battleResult.destructionPercentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Duration */}
            <Card className="p-4 bg-slate-800/50 border-slate-700">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Battle Duration</span>
                </div>
                <div className="text-4xl font-bold text-blue-400">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500">
                  {durationSeconds} seconds
                </div>
              </div>
            </Card>
          </div>

          {/* Loot Display */}
          {(battleResult.lootGold ?? 0) > 0 || (battleResult.lootElixir ?? 0) > 0 ? (
            <div
              className={`transition-all duration-500 ${
                showLoot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Card className="p-6 bg-gradient-to-r from-yellow-900/30 to-purple-900/30 border-yellow-500/50">
                <h3 className="text-center text-xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  LOOT EARNED
                  <Trophy className="w-6 h-6" />
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Gold Loot */}
                  {(battleResult.lootGold ?? 0) > 0 && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 shadow-lg">
                        <Coins className="h-7 w-7 text-yellow-900" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Gold</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          +{formatNumber(battleResult.lootGold ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Elixir Loot */}
                  {(battleResult.lootElixir ?? 0) > 0 && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 shadow-lg">
                        <Droplet className="h-7 w-7 text-purple-100" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Elixir</p>
                        <p className="text-2xl font-bold text-purple-400">
                          +{formatNumber(battleResult.lootElixir ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div
              className={`transition-all duration-500 ${
                showLoot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Card className="p-4 bg-slate-800/50 border-slate-700 text-center">
                <p className="text-slate-400">No loot earned - increase destruction to earn rewards!</p>
              </Card>
            </div>
          )}

          {/* Return Button */}
          <div
            className={`transition-all duration-500 ${
              showLoot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Button
              onClick={onReturnToVillage}
              size="lg"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg transform transition-all hover:scale-105"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Village
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
