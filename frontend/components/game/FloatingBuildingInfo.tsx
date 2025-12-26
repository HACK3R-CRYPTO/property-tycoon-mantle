'use client';

import { Building, resourcesApi } from '@/lib/api';
import { getBuildingVisual } from '@/lib/config/buildings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X, Home, Heart, Coins, Droplet, Zap, Shield, Target, Clock, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/lib/stores/useToastStore';
import { useFloatingNumberStore } from '@/lib/stores/useFloatingNumberStore';
import { buildingsApi, BuildingConfig } from '@/lib/api/buildings';

interface FloatingBuildingInfoProps {
  building: Building;
  onClose: () => void;
  isBuildingUnderConstruction: (building: Building) => boolean;
  getRemainingConstructionTime: (building: Building) => number;
  formatTime: (seconds: number) => string;
  onCollect: () => Promise<void>;
  currentGold?: number;
  maxGold?: number;
  currentElixir?: number;
  maxElixir?: number;
}

export function FloatingBuildingInfo({
  building,
  onClose,
  isBuildingUnderConstruction,
  getRemainingConstructionTime,
  formatTime,
  onCollect,
  currentGold = 0,
  maxGold = 10000,
  currentElixir = 0,
  maxElixir = 10000,
}: FloatingBuildingInfoProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [buildingConfig, setBuildingConfig] = useState<BuildingConfig | null>(null);
  const visualConfig = getBuildingVisual(building.type);
  const { success, warning } = useToastStore();
  const { showGold, showElixir } = useFloatingNumberStore();

  const isUnderConstruction = isBuildingUnderConstruction(building);

  // Load building config from backend
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configs = await buildingsApi.getBuildingConfigs();
        setBuildingConfig(configs[building.type] || null);
      } catch (error) {
        console.error('Failed to load building config:', error);
      }
    };
    loadConfig();
  }, [building.type]);

  const handleCollect = async () => {
    try {
      setIsCollecting(true);

      // Get amounts before collecting
      const goldAmount = building.type === 'gold_mine' ? (building.internalGold || 0) : 0;
      const elixirAmount = building.type === 'elixir_collector' ? (building.internalElixir || 0) : 0;

      // Check storage capacity
      if (building.type === 'gold_mine' && currentGold + goldAmount > maxGold) {
        const canCollect = maxGold - currentGold;
        if (canCollect <= 0) {
          warning('Storage Full!', 'Your gold storage is full. Upgrade storage to collect more.');
          setIsCollecting(false);
          return;
        }
      }

      if (building.type === 'elixir_collector' && currentElixir + elixirAmount > maxElixir) {
        const canCollect = maxElixir - currentElixir;
        if (canCollect <= 0) {
          warning('Storage Full!', 'Your elixir storage is full. Upgrade storage to collect more.');
          setIsCollecting(false);
          return;
        }
      }

      await resourcesApi.collectFromBuilding(building.id);

      // Show floating numbers
      const rect = document.querySelector('.fixed.bottom-6.left-6')?.getBoundingClientRect();
      if (rect) {
        if (goldAmount > 0) showGold(rect.left + rect.width / 2, rect.top, goldAmount);
        if (elixirAmount > 0) showElixir(rect.left + rect.width / 2, rect.top, elixirAmount);
      }

      // Refresh data and show success
      await onCollect();
      success('Resources Collected!', `Collected from ${visualConfig.name}`);
    } catch (error: any) {
      console.error('Failed to collect:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  const healthPercent = (building.health / building.maxHealth) * 100;
  const isCollector = building.type === 'gold_mine' || building.type === 'elixir_collector';
  const isStorage = building.type === 'gold_storage' || building.type === 'elixir_storage';
  const isDefense = building.type === 'cannon' || building.type === 'archer_tower';

  const storedAmount = building.type === 'gold_mine'
    ? (building.internalGold || 0)
    : (building.internalElixir || 0);
  const capacity = building.type === 'gold_mine'
    ? (building.internalGoldCapacity || 1000)
    : (building.internalElixirCapacity || 1000);
  const storedPercent = (storedAmount / capacity) * 100;

  // Check if storage is full
  const isStorageFull = building.type === 'gold_mine'
    ? currentGold >= maxGold
    : currentElixir >= maxElixir;
  const hasSpaceForCollection = building.type === 'gold_mine'
    ? (currentGold + storedAmount) <= maxGold
    : (currentElixir + storedAmount) <= maxElixir;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed bottom-6 left-6 z-40 w-96"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-white/20 shadow-2xl">
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ x: Math.random() * 384, y: Math.random() * 400 }}
                animate={{
                  y: [null, Math.random() * 400],
                  x: [null, Math.random() * 384],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <Sparkles className="text-amber-500/10" size={Math.random() * 15 + 5} />
              </motion.div>
            ))}
          </div>

          <div className="relative p-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
                  <Home className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{visualConfig.name}</h3>
                  <p className="text-sm text-gray-400">Level {building.level}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-110"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </motion.div>

            {/* Health Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-400" />
                  Health
                </span>
                <span className="text-sm font-bold text-white font-numbers">
                  {building.health} / {building.maxHealth}
                </span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthPercent}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    healthPercent > 60
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : healthPercent > 30
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-600'
                  }`}
                />
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3 mb-4"
            >
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Position</p>
                <p className="text-lg font-bold text-white font-numbers">
                  {building.positionX}, {building.positionY}
                </p>
              </div>
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Status</p>
                {isUnderConstruction ? (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-orange-400 animate-spin" />
                    <p className="text-xs font-bold text-orange-400">{formatTime(getRemainingConstructionTime(building))}</p>
                  </div>
                ) : (
                  <p className={`text-sm font-bold ${building.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {building.isActive ? '✓ Active' : '✗ Inactive'}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Collector Info */}
            {isCollector && !isUnderConstruction && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl p-4 border border-green-500/20 mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-green-400 flex items-center gap-1">
                    {building.type === 'gold_mine' ? <Coins className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
                    Stored
                  </span>
                  <span className="text-lg font-bold text-white font-numbers">
                    {storedAmount} / {capacity}
                  </span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${storedPercent}%` }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className={`h-full bg-gradient-to-r ${
                      building.type === 'gold_mine'
                        ? 'from-yellow-500 to-orange-600'
                        : 'from-purple-500 to-pink-600'
                    } rounded-full`}
                  />
                </div>
                {buildingConfig?.generationRate && (
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-400">Production</span>
                    <span className="font-bold text-green-400 font-numbers">
                      +{buildingConfig.generationRate}/hr
                    </span>
                  </div>
                )}
                {isStorageFull && (
                  <div className="bg-orange-500/20 rounded-lg p-3 mb-3 border border-orange-500/30">
                    <p className="text-sm text-orange-400 text-center">
                      ⚠️ Storage is full! Upgrade storage to collect more.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleCollect}
                  disabled={isCollecting || isStorageFull || storedAmount === 0}
                  className={`w-full transition-all duration-300 ${
                    isStorageFull || storedAmount === 0
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105'
                  }`}
                >
                  {isCollecting ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Collecting...
                    </>
                  ) : isStorageFull ? (
                    <>
                      🏦 Storage Full
                    </>
                  ) : storedAmount === 0 ? (
                    <>
                      💤 Empty
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Collect Resources
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Storage Info */}
            {isStorage && buildingConfig && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl p-4 border border-blue-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Capacity</span>
                  <span className="text-xl font-bold text-blue-400 font-numbers">
                    {buildingConfig.capacity?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Defense Info */}
            {isDefense && buildingConfig?.defense && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-red-500/10 to-pink-500/5 rounded-xl p-4 border border-red-500/20"
              >
                <p className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  DEFENSE STATS
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-500/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-1">DMG</p>
                    <p className="text-lg font-bold text-red-400 font-numbers">
                      {buildingConfig.defense.damage}
                    </p>
                  </div>
                  <div className="bg-blue-500/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-1">Range</p>
                    <p className="text-lg font-bold text-blue-400 font-numbers">
                      {buildingConfig.defense.range}
                    </p>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-1">Speed</p>
                    <p className="text-sm font-bold text-yellow-400 font-numbers">
                      {buildingConfig.defense.attackSpeed}s
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Under Construction Message */}
            {isUnderConstruction && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl p-4 border border-orange-500/20 text-center"
              >
                <Clock className="w-8 h-8 text-orange-400 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-300">
                  This building will be functional once construction is complete
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
