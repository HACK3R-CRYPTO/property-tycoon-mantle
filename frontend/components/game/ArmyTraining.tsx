'use client';

import { useEffect, useState } from 'react';
import { troopsApi, TroopStats, TrainingQueueItem, ArmyTroop } from '@/lib/api/troops';
import { useVillageStore } from '@/lib/stores/useVillageStore';
import { useToastStore } from '@/lib/stores/useToastStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Swords, Users, Zap, Heart, Target } from 'lucide-react';

interface ArmyTrainingProps {
  onClose: () => void;
}

export function ArmyTraining({ onClose }: ArmyTrainingProps) {
  const { village } = useVillageStore();
  const { success, error: showError, info } = useToastStore();

  const [availableTroops, setAvailableTroops] = useState<TroopStats[]>([]);
  const [trainingQueue, setTrainingQueue] = useState<TrainingQueueItem[]>([]);
  const [army, setArmy] = useState<ArmyTroop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [troops, queue, armyData] = await Promise.all([
        troopsApi.getAvailableTroops(),
        troopsApi.getTrainingQueue(),
        troopsApi.getArmy(),
      ]);
      setAvailableTroops(troops);
      setTrainingQueue(queue);
      setArmy(armyData);
    } catch (err: any) {
      console.error('Failed to load army data:', err);
      showError('Loading Failed', 'Failed to load army data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload queue and army every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [queue, armyData] = await Promise.all([
          troopsApi.getTrainingQueue(),
          troopsApi.getArmy(),
        ]);
        setTrainingQueue(queue);
        setArmy(armyData);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTrainTroop = async (troop: TroopStats) => {
    try {
      await troopsApi.trainTroop(troop.type);
      await loadData();
      await useVillageStore.getState().fetchVillage();
      success('Training Started!', `${troop.icon} ${troop.name} is now in training`);
    } catch (err: any) {
      showError('Training Failed', err.response?.data?.message || 'Failed to train troop');
    }
  };

  const handleCancelTraining = async (item: TrainingQueueItem) => {
    try {
      await troopsApi.cancelTraining(item.id);
      await loadData();
      await useVillageStore.getState().fetchVillage();
      info('Training Cancelled', `${item.troopConfig.icon} ${item.troopConfig.name} training cancelled`);
    } catch (err: any) {
      showError('Cancel Failed', err.response?.data?.message || 'Failed to cancel training');
    }
  };

  const calculateProgress = (item: TrainingQueueItem): number => {
    const now = new Date().getTime();
    const start = new Date(item.startedAt).getTime();
    const end = new Date(item.completesAt).getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getTimeRemaining = (completesAt: string): string => {
    const now = new Date().getTime();
    const end = new Date(completesAt).getTime();
    const remaining = Math.max(0, end - now);

    const seconds = Math.floor((remaining / 1000) % 60);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTotalHousingSpace = (): number => {
    return army.reduce((total, troop) => {
      return total + (troop.troopConfig.housingSpace * troop.count);
    }, 0);
  };

  const getQueueHousingSpace = (): number => {
    return trainingQueue.reduce((total, item) => {
      return total + item.troopConfig.housingSpace;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl p-6">
        <div className="flex items-center justify-center h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Sparkles className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-spin" />
            <p className="text-xl text-amber-400 font-bold" style={{ letterSpacing: '0.1em' }}>
              LOADING ARMY...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const totalHousingSpace = getTotalHousingSpace();
  const queueHousingSpace = getQueueHousingSpace();
  const maxCapacity = 100;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl overflow-y-auto">
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ x: Math.random() * 600, y: Math.random() * 1000 }}
            animate={{
              y: [null, Math.random() * 1000],
              x: [null, Math.random() * 600],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <Sparkles className="text-purple-500/10" size={Math.random() * 20 + 10} />
          </motion.div>
        ))}
      </div>

      <div className="relative p-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h2
              className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2"
              style={{ letterSpacing: '0.1em' }}
            >
              <Swords className="inline-block w-8 h-8 mr-3 text-purple-400" />
              ARMY CAMP
            </h2>
            <p className="text-gray-400 ml-11">Train troops and build your unstoppable army</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-110"
          >
            <X className="h-6 w-6 text-gray-400 hover:text-white" />
          </button>
        </motion.div>

        {/* Army Capacity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 p-6 mb-6"
        >
          {/* Shimmer */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                ARMY CAPACITY
              </h3>
              <span className="text-2xl font-bold text-white font-numbers">
                {totalHousingSpace} / {maxCapacity}
              </span>
            </div>
            {queueHousingSpace > 0 && (
              <p className="text-sm text-gray-400 mb-3">
                +{queueHousingSpace} troops in training
              </p>
            )}
            <div className="h-4 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(totalHousingSpace / maxCapacity) * 100}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Training Queue */}
        {trainingQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 backdrop-blur-md border border-blue-500/30 p-6 mb-6"
          >
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              TRAINING QUEUE ({trainingQueue.length})
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {trainingQueue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-5xl"
                      >
                        {item.troopConfig.icon}
                      </motion.span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-white text-lg">{item.troopConfig.name}</h4>
                          <Badge className="bg-blue-600 text-white">#{item.queuePosition + 1}</Badge>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${calculateProgress(item)}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                          />
                        </div>
                        <p className="text-sm text-gray-400 font-numbers">
                          ⏱️ {getTimeRemaining(item.completesAt)} remaining
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelTraining(item)}
                        className="bg-red-600 hover:bg-red-700 transition-all duration-300 hover:scale-105"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Your Army */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-md border border-green-500/30 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5" />
            YOUR ARMY
          </h3>
          {army.length === 0 ? (
            <div className="text-center py-12">
              <Swords className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No troops trained yet</p>
              <p className="text-sm text-gray-500 mt-2">Train your first troop below!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {army.map((troop, index) => (
                <motion.div
                  key={troop.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-4 hover:border-green-500/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{troop.troopConfig.icon}</span>
                    <div>
                      <p className="font-bold text-white">{troop.troopConfig.name}</p>
                      <p className="text-2xl font-bold text-green-400 font-numbers">{troop.count}x</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Train Troops */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-md border border-purple-500/30 p-6"
        >
          <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            TRAIN TROOPS
          </h3>
          <div className="space-y-4">
            {availableTroops.map((troop, index) => {
              const canAfford = village && village.resources.elixir >= troop.cost.elixir;
              const hasSpace = totalHousingSpace + queueHousingSpace + troop.housingSpace <= maxCapacity;

              return (
                <motion.div
                  key={troop.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-5 hover:border-purple-500/50 transition-all duration-300"
                >
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
                  </div>

                  <div className="relative flex items-start gap-4">
                    <motion.span
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className="text-6xl cursor-pointer"
                    >
                      {troop.icon}
                    </motion.span>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white mb-1">{troop.name}</h4>
                      <p className="text-sm text-gray-400 mb-4">{troop.description}</p>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-red-500/20 rounded-lg p-2">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-gray-300">
                            HP: <span className="font-bold text-red-400 font-numbers">{troop.health}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-500/20 rounded-lg p-2">
                          <Swords className="w-4 h-4 text-orange-400" />
                          <span className="text-sm text-gray-300">
                            DMG: <span className="font-bold text-orange-400 font-numbers">{troop.damage}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-500/20 rounded-lg p-2">
                          <Target className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-300">
                            Range: <span className="font-bold text-blue-400 font-numbers">{troop.range}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-amber-500/20 rounded-lg p-2">
                          <Users className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-gray-300">
                            Space: <span className="font-bold text-amber-400 font-numbers">{troop.housingSpace}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-purple-400 font-numbers">💧 {troop.cost.elixir}</p>
                          <p className="text-sm text-gray-400 font-numbers">⏱️ {troop.trainingTime}s</p>
                        </div>
                        <Button
                          onClick={() => handleTrainTroop(troop)}
                          disabled={!canAfford || !hasSpace}
                          className={`transition-all duration-300 ${
                            canAfford && hasSpace
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105'
                              : 'opacity-50'
                          }`}
                        >
                          {!hasSpace ? '🏠 Full' : !canAfford ? '💰 Not enough' : '⚔️ Train'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
