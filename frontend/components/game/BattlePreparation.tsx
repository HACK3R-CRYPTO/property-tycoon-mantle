'use client';

import { useState, useEffect } from 'react';
import { battlesApi, OpponentVillage, BattleSession } from '@/lib/api/battles';
import { troopsApi, ArmyTroop } from '@/lib/api/troops';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Swords, AlertCircle, CheckCircle, Users, Target, Gamepad2, X } from 'lucide-react';

interface BattlePreparationProps {
  onBattleComplete: (battleResult: any) => void;
  onStartRealtimeBattle?: (battleSession: BattleSession, troops: { type: string; count: number }[]) => void;
  onCancel: () => void;
}

export function BattlePreparation({ onBattleComplete, onStartRealtimeBattle, onCancel }: BattlePreparationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [opponent, setOpponent] = useState<OpponentVillage | null>(null);
  const [army, setArmy] = useState<ArmyTroop[]>([]);
  const [selectedTroops, setSelectedTroops] = useState<{ type: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load army and find opponent in parallel
      const [armyData, opponentData] = await Promise.all([
        troopsApi.getArmy(),
        battlesApi.findOpponent(),
      ]);

      setArmy(armyData);
      setOpponent(opponentData);
    } catch (err: any) {
      console.error('Failed to load battle data:', err);
      setError(err.response?.data?.message || 'Failed to load battle data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTroop = (troopType: string, count: number) => {
    const existing = selectedTroops.find((t) => t.type === troopType);

    if (existing) {
      if (count === 0) {
        setSelectedTroops(selectedTroops.filter((t) => t.type !== troopType));
      } else {
        setSelectedTroops(
          selectedTroops.map((t) => (t.type === troopType ? { ...t, count } : t))
        );
      }
    } else if (count > 0) {
      setSelectedTroops([...selectedTroops, { type: troopType, count }]);
    }
  };

  const incrementTroop = (troopType: string) => {
    const troopData = army.find((t) => t.troopType === troopType);
    if (!troopData) return;

    const currentSelected = selectedTroops.find((t) => t.type === troopType)?.count || 0;
    if (currentSelected < troopData.count) {
      handleSelectTroop(troopType, currentSelected + 1);
    }
  };

  const decrementTroop = (troopType: string) => {
    const currentSelected = selectedTroops.find((t) => t.type === troopType)?.count || 0;
    if (currentSelected > 0) {
      handleSelectTroop(troopType, currentSelected - 1);
    }
  };

  const selectAllTroops = (troopType: string) => {
    const troopData = army.find((t) => t.troopType === troopType);
    if (troopData) {
      handleSelectTroop(troopType, troopData.count);
    }
  };

  const getTotalSelectedTroops = () => {
    return selectedTroops.reduce((total, t) => total + t.count, 0);
  };

  const handleAttack = async () => {
    if (!opponent || selectedTroops.length === 0) return;

    try {
      setIsAttacking(true);
      setError(null);

      if (onStartRealtimeBattle) {
        // Always use real-time battle
        const battleSession = await battlesApi.startBattle(opponent.opponentVillageId, selectedTroops);
        onStartRealtimeBattle(battleSession, selectedTroops);
      }
    } catch (err: any) {
      console.error('Attack failed:', err);
      setError(err.response?.data?.message || 'Attack failed');
      setIsAttacking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
        <p className="text-lg text-gray-400">Finding opponent and loading your army...</p>
      </div>
    );
  }

  if (error && !opponent) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="bg-red-900/20 border-red-600 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={loadData} className="bg-amber-600 hover:bg-amber-700">
            <Loader2 className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={onCancel} variant="destructive" className="bg-red-600 hover:bg-red-700">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-red-500 pb-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2 text-red-400">
            <Swords className="h-6 w-6" />
            Battle Preparation
          </h2>
          <p className="text-sm text-gray-400">Select troops to deploy in battle</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-gray-800">
          <X className="h-5 w-5 text-gray-400 hover:text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-600 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Opponent Info */}
      {opponent && (
        <Card className="bg-gray-800/90 border-2 border-orange-600/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-orange-300">
              <Target className="h-5 w-5" />
              Target Village
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-900 border-2 border-orange-500 flex items-center justify-center">
                <Users className="h-8 w-8 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Enemy Village</p>
                <p className="text-sm text-gray-400">Ready to attack</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troop Selection */}
      <Card className="bg-gray-800/90 border-2 border-purple-600/50">
        <CardHeader>
          <CardTitle className="text-lg text-purple-300">Deploy Troops</CardTitle>
          <CardDescription className="text-gray-300 font-numbers">
            Selected: {getTotalSelectedTroops()} troops
          </CardDescription>
        </CardHeader>
        <CardContent>
          {army.length === 0 ? (
            <Alert className="bg-yellow-900/20 border-yellow-600 text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have any troops! Train some troops before attacking.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {army.map((troop) => {
                const selected = selectedTroops.find((t) => t.type === troop.troopType)?.count || 0;
                const available = troop.count;

                return (
                  <div key={troop.id} className="flex items-center justify-between p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{troop.troopConfig.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{troop.troopConfig.name}</p>
                        <p className="text-sm text-gray-400 font-numbers">
                          Available: {available}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => decrementTroop(troop.troopType)}
                        disabled={selected === 0}
                        className="bg-gray-800 hover:bg-gray-700 border-gray-600"
                      >
                        -
                      </Button>
                      <span className="min-w-[3rem] text-center font-bold text-lg text-purple-400 font-numbers">
                        {selected}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementTroop(troop.troopType)}
                        disabled={selected >= available}
                        className="bg-gray-800 hover:bg-gray-700 border-gray-600"
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => selectAllTroops(troop.troopType)}
                        disabled={selected === available}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        All
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attack Button */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-600/50 rounded-lg">
        <div>
          <p className="font-semibold text-xl text-red-300">Ready to attack?</p>
          <p className="text-sm text-gray-300 font-numbers">
            {selectedTroops.length === 0
              ? 'Select troops to begin the attack'
              : `${getTotalSelectedTroops()} troops selected for battle`}
          </p>
        </div>
        <Button
          onClick={handleAttack}
          disabled={selectedTroops.length === 0 || isAttacking}
          size="lg"
          className="min-w-[140px] bg-red-600 hover:bg-red-700 text-white"
        >
          {isAttacking ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Gamepad2 className="mr-2 h-5 w-5" />
              Start Battle
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
