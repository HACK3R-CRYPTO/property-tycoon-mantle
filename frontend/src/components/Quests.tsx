'use client'

import { useState, useEffect } from 'react'
import { Target, CheckCircle, Circle, Trophy, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface Quest {
  id: string
  title: string
  description: string
  reward: bigint
  progress: number
  target: number
  completed: boolean
  type: 'diversify' | 'yield' | 'properties' | 'guild'
}

export function Quests() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadQuests()
  }, [])

  const loadQuests = async () => {
    setIsLoading(true)
    try {
      const data = await api.get('/quests')
      setQuests(data)
    } catch (error) {
      console.error('Failed to load quests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const claimReward = async (questId: string) => {
    try {
      await api.post(`/quests/${questId}/claim`)
      loadQuests()
    } catch (error) {
      console.error('Failed to claim reward:', error)
    }
  }

  const formatValue = (value: bigint) => {
    const amount = Number(value) / 1e18
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
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
                  {quest.completed && (
                    <Button
                      onClick={() => claimReward(quest.id)}
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      Claim
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


