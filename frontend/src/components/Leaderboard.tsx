'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { VisitPortfolio } from './VisitPortfolio';
import { io, Socket } from 'socket.io-client';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username?: string;
  totalPortfolioValue: string | bigint; // Backend returns string (NUMERIC), frontend may use bigint
  totalYieldEarned: string | bigint;
  propertiesOwned: number;
  questsCompleted: number;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'guilds'>('global');
  const [guildLeaderboard, setGuildLeaderboard] = useState<any[]>([]);
  const [visitingPortfolio, setVisitingPortfolio] = useState<{ address: string; username?: string } | null>(null);

  useEffect(() => {
    // Load leaderboard immediately
    loadLeaderboard();
    
    // Subscribe to WebSocket for real-time leaderboard updates
    // Auto-detect production and use Railway backend if env var not set
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('railway.app'));
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
      (isProduction ? 'https://property-tycoon-mantle-production.up.railway.app' : 'http://localhost:3001');
    const socket = (window as any).socket || io(apiUrl);
    
    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit('subscribe:leaderboard');
    console.log('📡 Subscribed to leaderboard WebSocket updates');
    
    socket.on('leaderboard:updated', (data: { rankings: LeaderboardEntry[] }) => {
      console.log('📊 Leaderboard updated via WebSocket:', data);
      if (activeTab === 'global' && data.rankings) {
        setLeaderboard(data.rankings);
        console.log('✅ Updated leaderboard from WebSocket:', data.rankings.length, 'entries');
      }
    });
    
    // Also refresh periodically (every 5 seconds) to catch any missed updates
    // Only refresh global leaderboard periodically, not guild leaderboard
    // Guild leaderboard updates via WebSocket or manual refresh
    const refreshInterval = setInterval(() => {
      if (activeTab === 'global') {
        console.log('🔄 Periodic global leaderboard refresh...');
        // Only refresh global leaderboard, not guild leaderboard
        loadLeaderboard();
      }
    }, 30000); // Increased to 30 seconds to reduce load
    
    return () => {
      socket.off('leaderboard:updated');
      clearInterval(refreshInterval);
    };
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'global') {
        try {
          const data = await api.get('/leaderboard?limit=100');
          console.log('📊 Loaded leaderboard from backend:', data.length, 'entries');
          // Find current user's entry
          const userEntry = data.find((entry: LeaderboardEntry) => 
            entry.walletAddress?.toLowerCase() === '0xd2df53d9791e98db221842dd085f4144014bbe2a'.toLowerCase()
          );
          if (userEntry) {
            console.log('👤 Your leaderboard entry:', {
              propertiesOwned: userEntry.propertiesOwned,
              totalPortfolioValue: userEntry.totalPortfolioValue,
            });
          }
          setLeaderboard(data);
        } catch (error) {
          console.warn('Backend leaderboard unavailable, showing empty leaderboard:', error);
          // Backend unavailable - show empty state
          setLeaderboard([]);
        }
      } else {
        try {
          const data = await api.get('/guilds/leaderboard?limit=20');
          setGuildLeaderboard(data);
        } catch (error) {
          console.warn('Backend guild leaderboard unavailable:', error);
          setGuildLeaderboard([]);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setLeaderboard([]);
      setGuildLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: string | bigint) => {
    // Handle both string (from backend NUMERIC) and bigint
    const valueStr = typeof value === 'string' ? value : value.toString();
    // Value is already in wei (smallest unit), convert to TYCOON
    const tycoonAmount = Number(valueStr) / 1e18;
    if (tycoonAmount < 1) {
      return tycoonAmount.toFixed(2);
    }
    return tycoonAmount.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />;
    return <span className="text-gray-500 font-semibold">#{rank}</span>;
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Leaderboard
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setActiveTab('guilds')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'guilds'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Guilds
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading leaderboard...</div>
        ) : activeTab === 'global' ? (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No rankings yet</div>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.walletAddress}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(entry.rank)}
                    <div>
                      <p className="text-white font-semibold">
                        {entry.username || `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.propertiesOwned} properties • {entry.questsCompleted} quests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-emerald-400 font-semibold">{formatValue(entry.totalPortfolioValue)} TYCOON</p>
                      <p className="text-xs text-gray-400">Yield: {formatValue(entry.totalYieldEarned)}</p>
                    </div>
                    <Button
                      onClick={() => setVisitingPortfolio({ address: entry.walletAddress, username: entry.username })}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Visit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {guildLeaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No guilds yet</div>
            ) : (
              guildLeaderboard.map((guild) => (
                <div
                  key={guild.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(guild.rank)}
                    <div>
                      <p className="text-white font-semibold">{guild.name}</p>
                      <p className="text-xs text-gray-400">
                        {guild.totalMembers} members • Owner: {guild.owner?.username || `${guild.owner?.walletAddress?.slice(0, 6)}...${guild.owner?.walletAddress?.slice(-4)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold">{formatValue(guild.totalPortfolioValue)} TYCOON</p>
                    <p className="text-xs text-gray-400">Yield: {formatValue(guild.totalYieldEarned)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      {visitingPortfolio && (
        <VisitPortfolio
          address={visitingPortfolio.address}
          username={visitingPortfolio.username}
          onClose={() => setVisitingPortfolio(null)}
        />
      )}
    </Card>
  );
}
