'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Shield, Swords, Coins, Droplet, X, Clock, Sparkles, Zap, Home } from 'lucide-react';
import { BuildingType } from '@/lib/config/buildingsData';
import { buildingsApi, BuildingConfig } from '@/lib/api/buildings';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useToastStore } from '@/lib/stores/useToastStore';

interface BuildingShopProps {
  gold: number;
  elixir: number;
  onSelectBuilding: (buildingType: string) => void;
  onClose: () => void;
}

export function BuildingShop({ gold, elixir, onSelectBuilding, onClose }: BuildingShopProps) {
  const [selectedCategory, setSelectedCategory] = useState<'resource' | 'defense' | 'army'>('resource');
  const [buildingConfigs, setBuildingConfigs] = useState<Record<string, BuildingConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { info } = useToastStore();

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const configs = await buildingsApi.getBuildingConfigs();
        setBuildingConfigs(configs);
      } catch (error) {
        console.error('Failed to load building configs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfigs();
  }, []);

  if (isLoading || !buildingConfigs) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        <div className="h-full w-full max-w-4xl ml-auto bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl shadow-2xl overflow-auto p-6">
          <div className="flex items-center justify-center h-screen">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Building2 className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-spin" />
              <p className="text-xl text-amber-400 font-bold" style={{ letterSpacing: '0.1em' }}>
                LOADING BUILDINGS...
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const resourceBuildings = Object.values(buildingConfigs).filter(
    (b) => b.category === 'resource' && b.type !== 'town_hall',
  );

  const defenseBuildings = Object.values(buildingConfigs).filter((b) => b.category === 'defense');

  const armyBuildings = Object.values(buildingConfigs).filter((b) => b.category === 'army');

  const canAfford = (config: BuildingConfig) => {
    return gold >= config.baseCost.gold && elixir >= config.baseCost.elixir;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleSelectBuilding = (config: BuildingConfig) => {
    onSelectBuilding(config.type);
    info('Placement Mode', `Click on the map to place ${config.name}`);
  };

  const BuildingCard = ({ config, index }: { config: BuildingConfig; index: number }) => {
    const affordable = canAfford(config);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border ${
          affordable ? 'border-white/20 hover:border-amber-500/50' : 'border-white/10 opacity-60'
        } transition-all duration-300 ${affordable ? 'hover:scale-105' : ''}`}
      >
        {/* Shimmer effect */}
        {affordable && (
          <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
          </div>
        )}

        <div className="relative p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{config.name}</h3>
              <p className="text-xs text-gray-400">{config.description}</p>
            </div>
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Home className="w-8 h-8 text-amber-400" />
            </motion.div>
          </div>

          {/* Costs */}
          <div className="flex items-center gap-3 mb-4">
            {config.baseCost.gold > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/20 rounded-lg px-3 py-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-yellow-400 font-numbers">
                  {formatNumber(config.baseCost.gold)}
                </span>
              </div>
            )}
            {config.baseCost.elixir > 0 && (
              <div className="flex items-center gap-2 bg-purple-500/20 rounded-lg px-3 py-2">
                <Droplet className="h-4 w-4 text-purple-400" />
                <span className="font-bold text-purple-400 font-numbers">
                  {formatNumber(config.baseCost.elixir)}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Size:</span>
              <span className="font-bold text-white font-numbers">
                {config.size.width}x{config.size.height}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Build Time:
              </span>
              <span className="font-bold text-white font-numbers">{formatTime(config.buildTime)}</span>
            </div>
            {config.capacity && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Capacity:</span>
                <span className="font-bold text-amber-400 font-numbers">{config.capacity}</span>
              </div>
            )}
          </div>

          {/* Generation rate */}
          {config.generationRate && (
            <div className="flex items-center gap-2 bg-green-500/20 rounded-lg px-3 py-2 mb-4">
              <Sparkles className="h-4 w-4 text-green-400" />
              <span className="text-sm font-bold text-green-400 font-numbers">
                +{config.generationRate}/hr
              </span>
            </div>
          )}

          {/* Defense stats */}
          {config.defense && (
            <div className="space-y-2 border-t border-white/10 pt-3 mb-4">
              <p className="text-xs font-bold text-red-400 mb-2">⚔️ DEFENSE STATS</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-500/20 rounded-lg px-2 py-1">
                  <span className="text-gray-400">DMG:</span>{' '}
                  <span className="font-bold text-red-400 font-numbers">{config.defense.damage}</span>
                </div>
                <div className="bg-blue-500/20 rounded-lg px-2 py-1">
                  <span className="text-gray-400">Range:</span>{' '}
                  <span className="font-bold text-blue-400 font-numbers">{config.defense.range}</span>
                </div>
                <div className="bg-yellow-500/20 rounded-lg px-2 py-1 col-span-2">
                  <span className="text-gray-400">Speed:</span>{' '}
                  <span className="font-bold text-yellow-400 font-numbers">{config.defense.attackSpeed}s</span>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={() => handleSelectBuilding(config)}
            disabled={!affordable}
            className={`w-full transition-all duration-300 ${
              affordable
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 hover:scale-105'
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            {affordable ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Place Building
              </>
            ) : (
              '💰 Need More Resources'
            )}
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-4xl ml-auto bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl shadow-2xl overflow-y-auto"
      >
        {/* Floating particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ x: Math.random() * 800, y: Math.random() * 1000 }}
              animate={{
                y: [null, Math.random() * 1000],
                x: [null, Math.random() * 800],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              <Sparkles className="text-amber-500/10" size={Math.random() * 20 + 10} />
            </motion.div>
          ))}
        </div>

        <div className="relative p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-6"
          >
            <div>
              <h2
                className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2"
                style={{ letterSpacing: '0.1em' }}
              >
                <Building2 className="inline-block w-8 h-8 mr-3 text-amber-400" />
                BUILDING SHOP
              </h2>
              <p className="text-gray-400 ml-11">Select a building to place in your village</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-110"
            >
              <X className="h-6 w-6 text-gray-400 hover:text-white" />
            </button>
          </motion.div>

          {/* Resources Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-4 mb-6"
          >
            <div className="relative overflow-hidden flex items-center gap-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-md border border-yellow-500/30 px-5 py-3">
              <Coins className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="text-xs text-gray-400">Gold</p>
                <AnimatedCounter
                  value={gold}
                  className="font-bold text-yellow-400 font-numbers text-xl"
                  formatValue={formatNumber}
                  showChangeIndicator={false}
                />
              </div>
            </div>
            <div className="relative overflow-hidden flex items-center gap-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-md border border-purple-500/30 px-5 py-3">
              <Droplet className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-xs text-gray-400">Elixir</p>
                <AnimatedCounter
                  value={elixir}
                  className="font-bold text-purple-400 font-numbers text-xl"
                  formatValue={formatNumber}
                  showChangeIndicator={false}
                />
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 p-1 mb-6">
                <TabsTrigger
                  value="resource"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all duration-300"
                  style={{ letterSpacing: '0.05em' }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Resources
                </TabsTrigger>
                <TabsTrigger
                  value="defense"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                  style={{ letterSpacing: '0.05em' }}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Defense
                </TabsTrigger>
                <TabsTrigger
                  value="army"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                  style={{ letterSpacing: '0.05em' }}
                >
                  <Swords className="mr-2 h-4 w-4" />
                  Army
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="resource" className="mt-0">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {resourceBuildings.map((building, index) => (
                      <BuildingCard key={building.type} config={building} index={index} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="defense" className="mt-0">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {defenseBuildings.map((building, index) => (
                      <BuildingCard key={building.type} config={building} index={index} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="army" className="mt-0">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {armyBuildings.map((building, index) => (
                      <BuildingCard key={building.type} config={building} index={index} />
                    ))}
                  </div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
