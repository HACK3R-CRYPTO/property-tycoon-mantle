'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAccount } from 'wagmi';

interface Guild {
  id: string;
  name: string;
  description?: string;
  owner: {
    walletAddress: string;
    username?: string;
  };
  totalMembers: number;
  totalPortfolioValue: bigint;
  totalYieldEarned: bigint;
  isPublic: boolean;
  members?: Array<{
    userId: string;
    role: string;
    contribution: bigint;
    user: {
      walletAddress: string;
      username?: string;
    };
  }>;
}

export function Guilds() {
  const { address } = useAccount();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');

  useEffect(() => {
    if (address) {
      loadGuilds();
      loadMyGuild();
    }
  }, [address]);

  const loadGuilds = async () => {
    setIsLoading(true);
    try {
      const data = searchQuery
        ? await api.get(`/guilds/search?q=${encodeURIComponent(searchQuery)}`)
        : await api.get('/guilds/leaderboard?limit=20');
      setGuilds(data);
    } catch (error) {
      console.error('Failed to load guilds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyGuild = async () => {
    if (!address) return;
    try {
      // First get user ID from wallet address
      const user = await api.get(`/properties/owner/${address}`);
      if (user && user.length > 0 && user[0].ownerId) {
        const guild = await api.get(`/guilds/user/${user[0].ownerId}`);
        setMyGuild(guild);
      }
    } catch (error) {
      // User might not be in a guild
      setMyGuild(null);
    }
  };

  const createGuild = async () => {
    if (!address || !guildName.trim()) return;
    try {
      // Get user ID from wallet address
      const user = await api.get(`/properties/owner/${address}`);
      if (!user || user.length === 0 || !user[0].ownerId) {
        alert('Please create a property first');
        return;
      }
      await api.post('/guilds', {
        ownerId: user[0].ownerId,
        name: guildName.trim(),
        description: guildDescription.trim(),
        isPublic: true,
      });
      setShowCreateModal(false);
      setGuildName('');
      setGuildDescription('');
      loadGuilds();
      loadMyGuild();
    } catch (error: any) {
      alert(error.message || 'Failed to create guild');
    }
  };

  const joinGuild = async (guildId: string) => {
    if (!address) return;
    try {
      const user = await api.get(`/properties/owner/${address}`);
      if (!user || user.length === 0 || !user[0].ownerId) {
        alert('Please create a property first');
        return;
      }
      await api.post(`/guilds/${guildId}/join`, {
        userId: user[0].ownerId,
      });
      loadGuilds();
      loadMyGuild();
    } catch (error: any) {
      alert(error.message || 'Failed to join guild');
    }
  };

  const leaveGuild = async (guildId: string) => {
    if (!address) return;
    try {
      const user = await api.get(`/properties/owner/${address}`);
      if (!user || user.length === 0 || !user[0].ownerId) {
        return;
      }
      await api.post(`/guilds/${guildId}/leave`, {
        userId: user[0].ownerId,
      });
      loadGuilds();
      loadMyGuild();
    } catch (error: any) {
      alert(error.message || 'Failed to leave guild');
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
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guilds
            </CardTitle>
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Guild
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search guilds..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    loadGuilds();
                  }
                }}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md border-white/20 bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-white">Create Guild</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Guild Name"
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={guildDescription}
                    onChange={(e) => setGuildDescription(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={createGuild} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Create
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCreateModal(false);
                        setGuildName('');
                        setGuildDescription('');
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {myGuild && (
            <div className="mb-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <p className="text-white font-semibold">{myGuild.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{myGuild.description || 'No description'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {myGuild.totalMembers} members • {formatValue(myGuild.totalPortfolioValue)} TYCOON portfolio
                  </p>
                </div>
                <Button onClick={() => leaveGuild(myGuild.id)} variant="outline" size="sm">
                  Leave
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading guilds...</div>
          ) : guilds.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No guilds found</div>
          ) : (
            <div className="space-y-2">
              {guilds.map((guild) => (
                <div
                  key={guild.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-white font-semibold">{guild.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{guild.description || 'No description'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {guild.totalMembers} members • {formatValue(guild.totalPortfolioValue)} TYCOON
                    </p>
                  </div>
                  {!myGuild && (
                    <Button onClick={() => joinGuild(guild.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Join
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

