'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, QUEST_SYSTEM_ABI } from '@/lib/contracts';

interface Quest {
  id: number;
  name: string;
  description: string;
  rewardAmount: bigint;
  requiredProperties?: number;
  completed?: boolean;
  progress?: number;
}

export function Quests() {
  const { address, isConnected } = useAccount();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingQuest, setClaimingQuest] = useState<number | null>(null);

  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    if (address) {
      loadQuests();
    }
  }, [address]);

  useEffect(() => {
    if (isClaimSuccess) {
      setClaimingQuest(null);
      loadQuests();
    }
  }, [isClaimSuccess]);

  const loadQuests = async () => {
    setIsLoading(true);
    try {
      const [allQuests, progress] = await Promise.all([
        api.get('/quests'),
        address ? api.get(`/quests/progress/${address}`).catch(() => []) : Promise.resolve([]),
      ]);

      const progressMap = new Map(progress.map((p: any) => [p.questId, p]));

      const mappedQuests = allQuests.map((q: any) => {
        const prog = progressMap.get(q.questId);
        return {
          id: q.questId,
          name: q.name,
          description: q.description,
          rewardAmount: BigInt(q.rewardAmount?.toString() || '0'),
          requiredProperties: q.requiredProperties || 0,
          completed: prog?.completed || false,
          progress: prog?.progress || 0,
        };
      });

      setQuests(mappedQuests);
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async (questId: number) => {
    if (!address || !isConnected) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setClaimingQuest(questId);
      writeClaim({
        address: CONTRACTS.QuestSystem,
        abi: QUEST_SYSTEM_ABI,
        functionName: 'claimQuestReward',
        args: [BigInt(questId)],
      });
    } catch (error: any) {
      console.error('Failed to claim reward:', error);
      alert(error.message || 'Failed to claim reward');
      setClaimingQuest(null);
    }
  };

  const formatValue = (value: bigint) => {
    const tycoonAmount = Number(value) / 1e18;
    if (tycoonAmount < 1) {
      return tycoonAmount.toFixed(2);
    }
    return tycoonAmount.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-yellow-400" />
          Investment Quests
        </CardTitle>
        <p className="text-sm text-gray-400">Complete quests to earn rewards</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading quests...</div>
        ) : quests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No quests available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className={`p-4 rounded-lg border ${
                  quest.completed
                    ? 'bg-emerald-900/20 border-emerald-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {quest.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <h3 className="text-white font-semibold">{quest.name}</h3>
                      {quest.completed && (
                        <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{quest.description}</p>
                    {quest.requiredProperties > 0 && (
                      <p className="text-xs text-gray-500">
                        Requires: {quest.requiredProperties} properties
                      </p>
                    )}
                    {quest.progress !== undefined && quest.progress > 0 && !quest.completed && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((quest.progress / (quest.requiredProperties || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Progress: {quest.progress} / {quest.requiredProperties || 1}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <p className="text-yellow-400 font-semibold">
                        {formatValue(quest.rewardAmount)} TYCOON
                      </p>
                    </div>
                    {quest.completed && (
                      <Button
                        onClick={() => claimReward(quest.id)}
                        disabled={claimingQuest === quest.id || isClaimPending || isClaimConfirming}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        size="sm"
                      >
                        {claimingQuest === quest.id
                          ? isClaimConfirming
                            ? 'Claiming...'
                            : 'Claiming...'
                          : 'Claim Reward'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

