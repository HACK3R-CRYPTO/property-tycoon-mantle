'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useVillageStore } from '@/lib/stores/useVillageStore';
import { troopsApi, TroopStats, TrainingQueueItem, ArmyTroop } from '@/lib/api/troops';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

export default function ArmyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { village } = useVillageStore();

  const [availableTroops, setAvailableTroops] = useState<TroopStats[]>([]);
  const [trainingQueue, setTrainingQueue] = useState<TrainingQueueItem[]>([]);
  const [army, setArmy] = useState<ArmyTroop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

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
      setError(null);
    } catch (err: any) {
      console.error('Failed to load army data:', err);
      setError(err.response?.data?.message || 'Failed to load army data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Reload queue and army every 5 seconds to show progress
  useEffect(() => {
    if (!isAuthenticated) return;

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
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleTrainTroop = async (troopType: string) => {
    try {
      await troopsApi.trainTroop(troopType);
      await loadData(); // Reload all data after training
      await useVillageStore.getState().fetchVillage(); // Refresh resources
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to train troop');
    }
  };

  const handleCancelTraining = async (trainingId: string) => {
    if (!confirm('Cancel this training? You will get a refund.')) return;

    try {
      await troopsApi.cancelTraining(trainingId);
      await loadData();
      await useVillageStore.getState().fetchVillage();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel training');
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

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading army data...</div>
      </div>
    );
  }

  const totalHousingSpace = getTotalHousingSpace();
  const queueHousingSpace = getQueueHousingSpace();
  const maxCapacity = 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Army Camp</h1>
          <p className="text-muted-foreground">Train troops and manage your army</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/village')}>
          Back to Village
        </Button>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Army Capacity */}
      <Card>
        <CardHeader>
          <CardTitle>Army Capacity</CardTitle>
          <CardDescription>
            {totalHousingSpace} / {maxCapacity} troops
            {queueHousingSpace > 0 && ` (+${queueHousingSpace} in training)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(totalHousingSpace / maxCapacity) * 100} className="h-4" />
        </CardContent>
      </Card>

      {/* Training Queue */}
      {trainingQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training Queue ({trainingQueue.length})</CardTitle>
            <CardDescription>Troops currently being trained</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {trainingQueue.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-3xl">{item.troopConfig.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.troopConfig.name}</h3>
                        <Badge variant="secondary">#{item.queuePosition + 1}</Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <Progress value={calculateProgress(item)} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {getTimeRemaining(item.completesAt)} remaining
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancelTraining(item.id)}
                  >
                    Cancel
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Current Army */}
      <Card>
        <CardHeader>
          <CardTitle>Your Army</CardTitle>
          <CardDescription>Trained troops ready for battle</CardDescription>
        </CardHeader>
        <CardContent>
          {army.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No troops trained yet. Start training below!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {army.map((troop) => (
                <div key={troop.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <span className="text-4xl">{troop.troopConfig.icon}</span>
                  <div>
                    <h3 className="font-semibold">{troop.troopConfig.name}</h3>
                    <p className="text-2xl font-bold text-primary">{troop.count}x</p>
                    <p className="text-sm text-muted-foreground">
                      {troop.count * troop.troopConfig.housingSpace} space
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Troops */}
      <Card>
        <CardHeader>
          <CardTitle>Train Troops</CardTitle>
          <CardDescription>Select a troop to add to the training queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTroops.map((troop) => {
              const canAfford = village && village.resources.elixir >= troop.cost.elixir;
              const hasSpace = totalHousingSpace + queueHousingSpace + troop.housingSpace <= maxCapacity;

              return (
                <div key={troop.type} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">{troop.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{troop.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{troop.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">HP:</span> {troop.health}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Damage:</span> {troop.damage}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Range:</span> {troop.range}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Space:</span> {troop.housingSpace}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            💧 {troop.cost.elixir} Elixir
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ⏱️ {troop.trainingTime}s
                          </p>
                        </div>
                        <Button
                          onClick={() => handleTrainTroop(troop.type)}
                          disabled={!canAfford || !hasSpace}
                          size="sm"
                        >
                          {!hasSpace ? 'Full' : !canAfford ? 'Not enough' : 'Train'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Train troops, manage your army, and prepare for battle!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
