'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { battlesApi, BattleResult, PublicBattle } from '@/lib/api/battles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SlidePanel } from '@/components/ui/slide-panel';
import {
  Shield,
  Swords,
  Star,
  Coins,
  Droplet,
  Eye,
  Trophy,
  Skull,
  Target,
  Zap,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useBattleStore } from '@/lib/stores';
// Note: Attack notifications were removed with gateway consolidation
// They can be re-implemented via a separate notification service if needed
import { useToast } from '@/hooks/use-toast';

interface WarRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WarRoomModal({ isOpen, onClose }: WarRoomModalProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const { setBattleSession, setSelectedTroops } = useBattleStore();

  const [activeTab, setActiveTab] = useState('active');
  const [attacks, setAttacks] = useState<BattleResult[]>([]);
  const [defenses, setDefenses] = useState<BattleResult[]>([]);
  const [liveBattles, setLiveBattles] = useState<PublicBattle[]>([]);
  const [myActiveBattles, setMyActiveBattles] = useState<PublicBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all battle data
  useEffect(() => {
    if (isOpen && user) {
      loadAllBattles();
    }
  }, [isOpen, user]);

  const loadAllBattles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load attacks, defenses, live battles, and user's active battles in parallel
      const [attacksData, defensesData, liveData, myActiveData] = await Promise.all([
        battlesApi.getHistory(50),
        battlesApi.getDefenses(50),
        battlesApi.getRecentBattles(50),
        battlesApi.getActiveBattles(),
      ]);

      setAttacks(attacksData.battles);
      setDefenses(defensesData.battles);

      // Filter live battles (status === 'active') - all public battles
      const activeBattles = liveData.battles.filter(b => b.status === 'active');
      setLiveBattles(activeBattles);

      // User's active battles they can rejoin
      setMyActiveBattles(myActiveData.battles);
    } catch (err: any) {
      console.error('Failed to load battles:', err);
      setError(err.response?.data?.message || 'Failed to load battles');
    } finally {
      setIsLoading(false);
    }
  };

  const getBattleOutcome = (battle: BattleResult, isDefense: boolean): 'victory' | 'defeat' => {
    if (isDefense) {
      // For defenses, victory = attacker got 0 stars
      return battle.stars === 0 ? 'victory' : 'defeat';
    } else {
      // For attacks, victory = got any stars
      return battle.stars > 0 ? 'victory' : 'defeat';
    }
  };

  const renderBattleCard = (battle: BattleResult, isDefense: boolean) => {
    const outcome = getBattleOutcome(battle, isDefense);
    const isVictory = outcome === 'victory';

    return (
      <Card
        key={battle.id}
        className={`overflow-hidden transition-all bg-gray-800/90 border-2 ${isVictory ? 'border-green-600/50 hover:border-green-500' : 'border-red-600/50 hover:border-red-500'}`}
      >
        <CardContent className="p-3">
          {/* Header with Outcome Badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isVictory ? (
                <Trophy className="h-5 w-5 text-green-400" />
              ) : (
                <Skull className="h-5 w-5 text-red-400" />
              )}
              <div>
                <Badge
                  className={`text-xs px-2 py-0.5 ${isVictory ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {isVictory ? 'Victory' : 'Defeat'}
                </Badge>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-0.5">
              {[1, 2, 3].map((starNum) => (
                <Star
                  key={starNum}
                  className={`h-4 w-4 ${
                    starNum <= battle.stars
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'fill-muted text-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Battle VS Display */}
          <div className="grid grid-cols-3 items-center gap-2 mb-2">
            <div className="text-center">
              {isDefense ? (
                <>
                  <Swords className="h-5 w-5 mx-auto mb-1 text-red-400" />
                  <p className="font-bold text-xs text-gray-300">Attacker</p>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                  <p className="font-bold text-xs text-gray-300">You</p>
                </>
              )}
            </div>

            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto text-yellow-400" />
            </div>

            <div className="text-center">
              {isDefense ? (
                <>
                  <Shield className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                  <p className="font-bold text-xs text-gray-300">You</p>
                </>
              ) : (
                <>
                  <Swords className="h-5 w-5 mx-auto mb-1 text-red-400" />
                  <p className="font-bold text-xs text-gray-300">Defender</p>
                </>
              )}
            </div>
          </div>

          {/* Destruction Bar */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Destruction
              </span>
              <span className="text-sm font-bold text-white font-numbers">
                {battle.destructionPercentage}%
              </span>
            </div>
            <Progress
              value={battle.destructionPercentage}
              className="h-2 bg-gray-700"
            />
          </div>

          {/* Loot Display */}
          {(battle.lootGold > 0 || battle.lootElixir > 0) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 p-2 bg-gray-900/50 border border-yellow-600/30 rounded">
                <Coins className="h-4 w-4 text-yellow-400" />
                <div>
                  <p className="text-[10px] text-gray-400">Gold</p>
                  <p className="font-bold text-yellow-400 text-xs font-numbers">
                    {isDefense ? '-' : '+'}{battle.lootGold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-gray-900/50 border border-cyan-600/30 rounded">
                <Droplet className="h-4 w-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-400">Elixir</p>
                  <p className="font-bold text-cyan-400 text-xs font-numbers">
                    {isDefense ? '-' : '+'}{battle.lootElixir.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLiveBattleCard = (battle: PublicBattle) => {
    return (
      <Card
        key={battle.id}
        className="overflow-hidden bg-gray-800/90 border-2 border-orange-500 hover:border-orange-400"
      >
        <CardContent className="p-3">
          {/* Live Indicator */}
          <div className="flex items-center justify-between mb-2">
            <Badge className="text-xs px-2 py-0.5 animate-pulse bg-red-600 text-white">
              LIVE NOW
            </Badge>
            <Button
              size="sm"
              onClick={() => router.push(`/battle/${battle.id}/spectate?returnTo=/village`)}
              className="h-7 text-xs px-2 bg-orange-600 hover:bg-orange-700"
            >
              <Eye className="mr-1 h-3 w-3" />
              Spectate
            </Button>
          </div>

          {/* Battle Info */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-xs text-white">{battle.attackerVillage.name}</p>
              <p className="text-[10px] text-gray-400">Attacker</p>
            </div>
            <Swords className="h-5 w-5 text-orange-400" />
            <div className="text-right">
              <p className="font-bold text-xs text-white">{battle.defenderVillage.name}</p>
              <p className="text-[10px] text-gray-400">Defender</p>
            </div>
          </div>

          {/* Current Stats */}
          {battle.destructionPercentage > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                <span>Destruction</span>
                <span className="font-bold text-white font-numbers">{battle.destructionPercentage}%</span>
              </div>
              <Progress value={battle.destructionPercentage} className="h-1.5 bg-gray-700" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderMyActiveBattleCard = (battle: PublicBattle) => {
    const handleRejoin = async () => {
      try {
        // Fetch the full battle session to rejoin
        const session = await battlesApi.getBattleSession(battle.id);
        setBattleSession(session);

        // Set troops for rejoin (API now includes troops in session)
        if (session.troops && session.troops.length > 0) {
          setSelectedTroops(session.troops);
        }

        onClose(); // Close war room modal
        router.push(`/battle/${session.session.id}`);
      } catch (error) {
        console.error('Failed to rejoin battle:', error);
        toast({
          title: 'Failed to rejoin',
          description: 'Could not rejoin this battle. It may have ended.',
        });
      }
    };

    return (
      <Card
        key={battle.id}
        className="overflow-hidden bg-gray-800/90 border-2 border-green-500 hover:border-green-400"
      >
        <CardContent className="p-3">
          {/* Active Indicator */}
          <div className="flex items-center justify-between mb-2">
            <Badge className="text-xs px-2 py-0.5 bg-green-600 text-white">
              IN PROGRESS
            </Badge>
            <Button
              size="sm"
              onClick={handleRejoin}
              className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
            >
              <Zap className="mr-1 h-3 w-3" />
              Rejoin Battle
            </Button>
          </div>

          {/* Battle Info */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-xs text-white">You</p>
              <p className="text-[10px] text-gray-400">Attacker</p>
            </div>
            <Swords className="h-5 w-5 text-green-400" />
            <div className="text-right">
              <p className="font-bold text-xs text-white">{battle.defenderVillage.name}</p>
              <p className="text-[10px] text-gray-400">Defender</p>
            </div>
          </div>

          {/* Current Stats */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Destruction</span>
              <span className="font-bold text-white font-numbers">{battle.destructionPercentage}%</span>
            </div>
            <Progress value={battle.destructionPercentage} className="h-1.5 bg-gray-700" />
          </div>

          {/* Time */}
          <p className="text-[10px] text-gray-400 mt-2">
            Started {formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      width="600px"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b-2 border-amber-500">
        <Shield className="h-7 w-7 text-blue-400" />
        <h2 className="text-3xl font-bold text-amber-400">War Room</h2>
        <Swords className="h-7 w-7 text-red-400" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-600 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border border-gray-700">
          <TabsTrigger value="active" className="text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <Zap className="mr-1.5 h-4 w-4" />
            Active ({myActiveBattles.length})
          </TabsTrigger>
          <TabsTrigger value="defenses" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Shield className="mr-1.5 h-4 w-4" />
            Defenses ({defenses.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="text-sm data-[state=active]:bg-orange-600 data-[state=active]:text-white">
            <Bell className="mr-1.5 h-4 w-4" />
            Live ({liveBattles.length})
          </TabsTrigger>
          <TabsTrigger value="attacks" className="text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white">
            <Swords className="mr-1.5 h-4 w-4" />
            Attacks ({attacks.length})
          </TabsTrigger>
        </TabsList>

        {/* My Active Battles */}
        <TabsContent value="active" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-400">Loading active battles...</p>
            </div>
          ) : myActiveBattles.length === 0 ? (
            <Card className="bg-gray-800/90 border-2 border-gray-700">
              <CardContent className="py-8 text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <h3 className="text-base font-semibold mb-1 text-white">No active battles</h3>
                <p className="text-sm text-gray-400">
                  Your ongoing battles will appear here. You can rejoin them if you get disconnected!
                </p>
              </CardContent>
            </Card>
          ) : (
            myActiveBattles.map(renderMyActiveBattleCard)
          )}
        </TabsContent>

        {/* Defense Log */}
        <TabsContent value="defenses" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-400">Loading defenses...</p>
            </div>
          ) : defenses.length === 0 ? (
            <Card className="bg-gray-800/90 border-2 border-gray-700">
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-blue-400" />
                <h3 className="text-base font-semibold mb-1 text-white">No attacks yet</h3>
                <p className="text-sm text-gray-400">
                  Your defenses remain untested.
                </p>
              </CardContent>
            </Card>
          ) : (
            defenses.map(battle => renderBattleCard(battle, true))
          )}
        </TabsContent>

        {/* Live Attacks */}
        <TabsContent value="live" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-400">Scanning for battles...</p>
            </div>
          ) : liveBattles.length === 0 ? (
            <Card className="bg-gray-800/90 border-2 border-gray-700">
              <CardContent className="py-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 text-orange-400" />
                <h3 className="text-base font-semibold mb-1 text-white">No live attacks</h3>
                <p className="text-sm text-gray-400">
                  You'll see real-time battles here!
                </p>
              </CardContent>
            </Card>
          ) : (
            liveBattles.map(renderLiveBattleCard)
          )}
        </TabsContent>

        {/* Attack History */}
        <TabsContent value="attacks" className="space-y-3 mt-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-400">Loading attacks...</p>
            </div>
          ) : attacks.length === 0 ? (
            <Card className="bg-gray-800/90 border-2 border-gray-700">
              <CardContent className="py-8 text-center">
                <Swords className="h-12 w-12 mx-auto mb-3 text-red-400" />
                <h3 className="text-base font-semibold mb-1 text-white">No attacks launched</h3>
                <p className="text-sm text-gray-400">
                  Attack other villages to gain resources!
                </p>
              </CardContent>
            </Card>
          ) : (
            attacks.map(battle => renderBattleCard(battle, false))
          )}
        </TabsContent>
      </Tabs>
    </SlidePanel>
  );
}
