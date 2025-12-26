'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { battlesApi, BattleResult } from '@/lib/api/battles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  Star,
  Target,
  Coins,
  Droplet,
  Calendar,
  ArrowLeft,
  Trophy,
  AlertCircle,
  Swords
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BattlesHistoryPage() {
  const router = useRouter();
  const [battles, setBattles] = useState<BattleResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBattles();
  }, []);

  const loadBattles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await battlesApi.getHistory(50);
      setBattles(data.battles);
    } catch (err: any) {
      console.error('Failed to load battle history:', err);
      setError(err.response?.data?.message || 'Failed to load battle history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStarColor = (stars: number) => {
    if (stars === 3) return 'text-yellow-500';
    if (stars >= 2) return 'text-yellow-400';
    if (stars >= 1) return 'text-yellow-300';
    return 'text-muted';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Battle History
          </h1>
          <p className="text-muted-foreground">View your past attacks and results</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/village')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Village
        </Button>
      </div>

      {/* Stats Summary */}
      {!isLoading && battles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Swords className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{battles.length}</p>
                  <p className="text-xs text-muted-foreground">Total Battles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {battles.filter(b => b.stars > 0).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Victories</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">
                    {battles.filter(b => b.stars === 3).length}
                  </p>
                  <p className="text-xs text-muted-foreground">3-Star Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {battles.reduce((sum, b) => sum + b.lootGold + b.lootElixir, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Loot</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && battles.length === 0 && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No battles yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start attacking other villages to build your battle history!
                </p>
              </div>
              <Button onClick={() => router.push('/village')}>
                <Swords className="mr-2 h-4 w-4" />
                Attack a Village
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battles List */}
      {!isLoading && battles.length > 0 && (
        <div className="space-y-4">
          {battles.map((battle) => (
            <Card key={battle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      Battle {battle.id.slice(0, 8)}...
                      <Badge variant={battle.stars > 0 ? 'default' : 'secondary'}>
                        {battle.stars > 0 ? 'Victory' : 'Defeat'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((starNum) => (
                      <Star
                        key={starNum}
                        className={`h-5 w-5 ${
                          starNum <= battle.stars
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Destruction Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      Destruction
                    </span>
                    <span className="font-semibold">{battle.destructionPercentage}%</span>
                  </div>
                  <Progress value={battle.destructionPercentage} className="h-2" />
                </div>

                {/* Loot */}
                {(battle.lootGold > 0 || battle.lootElixir > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Gold</p>
                        <p className="font-bold text-yellow-500">
                          +{battle.lootGold.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Droplet className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Elixir</p>
                        <p className="font-bold text-purple-500">
                          +{battle.lootElixir.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
