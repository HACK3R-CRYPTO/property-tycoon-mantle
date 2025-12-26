'use client';

import React from 'react';
import { useSomniaBattleHistory } from '@/hooks/useSomniaBattleHistory';
import { BattleResult } from '@/lib/somnia/somniaBattleClient';

/**
 * Battle History Page
 *
 * Displays a live-updating history of all battles from Somnia DataStreams
 * This is a public page showing global battle results stored on-chain
 */
export default function BattleHistoryPage() {
  const { battleResults, isLoading, error, refresh } = useSomniaBattleHistory({
    limit: 50,
    pollInterval: 2000,
    autoRefresh: true,
  });

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStarDisplay = (stars: number) => {
    return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  };

  const getStatusBadge = (status: BattleResult['status']) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/50',
      abandoned: 'bg-red-500/20 text-red-400 border-red-500/50',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Battle History</h1>
          <p className="text-slate-400">
            Live battle results from Somnia DataStreams • Updates in real-time
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600
                         rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <div className="text-sm text-slate-400">
              {battleResults.length} battles found
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && battleResults.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400">Loading battle history from Somnia...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && battleResults.length === 0 && !error && (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <svg
              className="w-16 h-16 mx-auto text-slate-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-slate-400 text-lg">No battle results found yet</p>
            <p className="text-slate-500 text-sm mt-2">
              Complete a battle to see it appear here
            </p>
          </div>
        )}

        {/* Battle Results Table */}
        {battleResults.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Battle ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Attacker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Defender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Loot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {battleResults.map((battle, index) => (
                    <tr
                      key={`${battle.battleId}-${index}`}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatTimestamp(battle.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-300">
                        {battle.battleId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-400">
                        {battle.attackerId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-400">
                        {battle.defenderId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm">{getStarDisplay(battle.stars)}</div>
                          <div className="text-xs text-slate-400">
                            {battle.destructionPercentage}% Destruction
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          <div className="text-yellow-400">
                            {battle.lootGold.toLocaleString()} Gold
                          </div>
                          <div className="text-purple-400">
                            {battle.lootElixir.toLocaleString()} Elixir
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(battle.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Real-time Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates enabled • Polling every 2 seconds</span>
        </div>
      </div>
    </div>
  );
}
