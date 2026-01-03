'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Target, CheckCircle, Circle, Trophy, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { CONTRACTS, QUEST_SYSTEM_ABI } from '@/lib/contracts'

interface Quest {
  id: string
  questId?: number // Numeric quest ID (0-4)
  title: string
  description: string
  reward: bigint
  progress: number
  target: number
  completed: boolean
  type: 'diversify' | 'yield' | 'properties' | 'guild'
}

export function Quests() {
  const { address } = useAccount()
  const [quests, setQuests] = useState<Quest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null)
  
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    loadQuests()
  }, [address])

  useEffect(() => {
    if (isSuccess && claimingQuestId) {
      // Quest claimed successfully, reload quests
      loadQuests()
      setClaimingQuestId(null)
    }
  }, [isSuccess, claimingQuestId])

  const loadQuests = async () => {
    setIsLoading(true)
    try {
      // Pass wallet address to get quests with progress
      const url = address ? `/quests?address=${address}` : '/quests'
      const data = await api.get(url)
      
      if (!Array.isArray(data)) {
        console.error('Invalid quest data format:', data)
        setQuests([])
        return
      }
      
      // Map backend data to frontend format
      const formattedQuests = data.map((q: any) => {
        // Handle reward - backend returns as string
        let reward: bigint
        try {
          if (typeof q.reward === 'bigint') {
            reward = q.reward
          } else if (typeof q.reward === 'string') {
            reward = BigInt(q.reward || '0')
          } else if (q.rewardAmount) {
            reward = BigInt(q.rewardAmount.toString() || '0')
          } else {
            reward = BigInt('0')
          }
        } catch (e) {
          console.warn('Error parsing reward for quest:', q, e)
          reward = BigInt('0')
        }
        
        return {
          id: q.id || q.questId?.toString() || '',
          questId: q.questId, // Store the numeric quest ID (0-4)
          title: q.title || q.name || 'Unknown Quest',
          description: q.description || '',
          reward,
          progress: q.progress || 0,
          target: q.target || q.requiredProperties || 1,
          completed: q.completed || false,
          type: q.type || 'properties',
        }
      })
      
      console.log(`✅ Loaded ${formattedQuests.length} quests`)
      setQuests(formattedQuests)
      
      // Sync quest progress from contract if user is connected
      if (address) {
        try {
          await api.get(`/quests/sync-progress/${address}`)
        } catch (error) {
          console.warn('Failed to sync quest progress:', error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load quests:', error)
      console.error('Error details:', error.response?.data || error.message)
      setQuests([])
    } finally {
      setIsLoading(false)
    }
  }

  const claimReward = async (questId: string, questType: number) => {
    if (!address) {
      console.error('Wallet not connected')
      return
    }

    try {
      setClaimingQuestId(questId)
      
      // Map quest type to contract function name
      let functionName: string
      switch (questType) {
        case 0: // FirstProperty
          functionName = 'checkFirstPropertyQuest'
          break
        case 1: // DiversifyPortfolio
          functionName = 'checkDiversifyPortfolioQuest'
          break
        case 3: // PropertyMogul
          functionName = 'checkPropertyMogulQuest'
          break
        case 4: // RWAPioneer
          functionName = 'checkRWAPioneerQuest'
          break
        default:
          console.error(`Quest type ${questType} not supported for claiming`)
          setClaimingQuestId(null)
          return
      }

      // Call the contract function directly
      writeContract({
        address: CONTRACTS.QuestSystem,
        abi: QUEST_SYSTEM_ABI,
        functionName: functionName as any,
        args: [address],
      })
    } catch (error) {
      console.error('Failed to claim reward:', error)
      setClaimingQuestId(null)
    }
  }

  const formatValue = (value: bigint | string | number) => {
    try {
      // Handle different input types
      let bigIntValue: bigint
      if (typeof value === 'bigint') {
        bigIntValue = value
      } else if (typeof value === 'string') {
        bigIntValue = BigInt(value)
      } else if (typeof value === 'number') {
        bigIntValue = BigInt(value)
      } else {
        return '0.00'
      }
      
      // Convert from wei to TYCOON (divide by 1e18)
      const divisor = BigInt('1000000000000000000') // 1e18
      const quotient = bigIntValue / divisor
      const remainder = bigIntValue % divisor
      const decimalPart = Number(remainder) / Number(divisor)
      const amount = Number(quotient) + decimalPart
      
      if (isNaN(amount) || !isFinite(amount)) {
        return '0.00'
      }
      
      if (amount < 1) return amount.toFixed(4)
      return amount.toFixed(2)
    } catch (error) {
      console.error('Error formatting value:', error, value)
      return '0.00'
    }
  }

  const getQuestIcon = (type: string) => {
    switch (type) {
      case 'diversify':
        return <TrendingUp className="w-5 h-5 text-blue-400" />
      case 'yield':
        return <Trophy className="w-5 h-5 text-yellow-400" />
      case 'properties':
        return <Target className="w-5 h-5 text-purple-400" />
      case 'guild':
        return <Trophy className="w-5 h-5 text-green-400" />
      default:
        return <Target className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Investment Quests</h2>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading quests...</div>
      ) : quests.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No quests available</div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => (
            <Card
              key={quest.id}
              className={`bg-white/5 border-white/10 ${
                quest.completed ? 'border-green-500/50 bg-green-500/5' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      {getQuestIcon(quest.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{quest.title}</h3>
                        {quest.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{quest.description}</p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>
                            {quest.progress} / {quest.target}
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((quest.progress / quest.target) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-yellow-400 font-semibold">
                        Reward: {formatValue(quest.reward)} TYCOON
                      </div>
                    </div>
                  </div>
                  {quest.completed ? (
                    <div className="text-xs text-green-400 font-semibold">✓ Completed</div>
                  ) : (
                    <Button
                      onClick={() => {
                        // Use questId from backend (0-4) or infer from quest data
                        const questType = quest.questId ?? 
                          (quest.title?.includes('First') ? 0 :
                           quest.title?.includes('Diversify') ? 1 :
                           quest.title?.includes('Mogul') ? 3 :
                           quest.title?.includes('RWA') ? 4 : 0)
                        claimReward(quest.id, questType)
                      }}
                      disabled={isPending || isConfirming || claimingQuestId === quest.id}
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending || isConfirming || claimingQuestId === quest.id
                        ? 'Checking...'
                        : 'Check & Claim'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
