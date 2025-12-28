'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Users, Plus, Crown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

interface Guild {
  id: string
  name: string
  description: string
  memberCount: number
  totalPortfolioValue: bigint
  totalYield: bigint
  owner: string
}

export function Guilds() {
  const { address, isConnected } = useAccount()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [guildName, setGuildName] = useState('')
  const [guildDescription, setGuildDescription] = useState('')
  const [myGuild, setMyGuild] = useState<any>(null)
  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null)

  useEffect(() => {
    loadGuilds()
    if (address) {
      loadMyGuild()
    }
  }, [address])

  const loadGuilds = async () => {
    setIsLoading(true)
    try {
      const data = await api.get('/guilds')
      setGuilds(data)
    } catch (error) {
      console.error('Failed to load guilds:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMyGuild = async () => {
    if (!address) return
    try {
      // Get guild by wallet address directly
      const guildResponse = await api.get(`/guilds/wallet/${address.toLowerCase()}`)
      setMyGuild(guildResponse)
    } catch (error) {
      // User might not be in a guild yet
      setMyGuild(null)
    }
  }

  const createGuild = async () => {
    if (!guildName.trim() || !address) return
    try {
      await api.post('/guilds', {
        walletAddress: address.toLowerCase(),
        name: guildName,
        description: guildDescription,
      })
      setGuildName('')
      setGuildDescription('')
      setShowCreateForm(false)
      loadGuilds()
      loadMyGuild()
    } catch (error: any) {
      console.error('Failed to create guild:', error)
      alert(error.response?.data?.message || 'Failed to create guild')
    }
  }

  const joinGuild = async (guildId: string) => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    // Check if already in a guild
    if (myGuild) {
      alert(`You are already a member of ${myGuild.name}. Leave it first to join another guild.`)
      return
    }
    
    setJoiningGuildId(guildId)
    try {
      await api.post(`/guilds/${guildId}/join`, {
        walletAddress: address.toLowerCase(),
      })
      // Reload both guilds list and my guild to update UI
      await Promise.all([loadGuilds(), loadMyGuild()])
      alert('Successfully joined guild!')
    } catch (error: any) {
      console.error('Failed to join guild:', error)
      const errorMessage = error.response?.data?.message || 'Failed to join guild'
      alert(errorMessage)
      // Reload my guild in case the join actually succeeded but returned an error
      if (errorMessage.includes('already a member')) {
        await loadMyGuild()
      }
    } finally {
      setJoiningGuildId(null)
    }
  }

  const formatValue = (value: bigint) => {
    const amount = Number(value) / 1e18
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Guilds</h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="outline"
          size="sm"
          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Guild
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-gray-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Create New Guild</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Guild name"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              className="bg-gray-900 border-white/10 text-white"
            />
            <Input
              placeholder="Description (optional)"
              value={guildDescription}
              onChange={(e) => setGuildDescription(e.target.value)}
              className="bg-gray-900 border-white/10 text-white"
            />
            <div className="flex gap-2">
              <Button onClick={createGuild} className="bg-green-500 hover:bg-green-600">
                Create
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                className="border-white/10"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {myGuild && (
        <Card className="bg-green-500/10 border-green-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-white font-semibold">My Guild: {myGuild.name}</h3>
                </div>
                {myGuild.description && (
                  <p className="text-sm text-gray-400 mt-1">{myGuild.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>{myGuild.totalMembers || myGuild.members?.length || 0} members</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading guilds...</div>
      ) : guilds.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No guilds yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {guilds.map((guild) => (
            <Card key={guild.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{guild.name}</h3>
                        {guild.owner && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      {guild.description && (
                        <p className="text-sm text-gray-400 mt-1">{guild.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{guild.memberCount} members</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {formatValue(guild.totalPortfolioValue)} TYCOON
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                    onClick={() => joinGuild(guild.id)}
                    disabled={joiningGuildId === guild.id || myGuild?.id === guild.id || !isConnected}
                  >
                    {joiningGuildId === guild.id ? 'Joining...' : myGuild?.id === guild.id ? 'Joined' : 'Join'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


