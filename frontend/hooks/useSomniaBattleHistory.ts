import { useEffect, useState, useCallback } from 'react';
import {
  BattleResult,
  fetchBattleResults,
  subscribeToBattleResults,
  initBattleResultSchema,
} from '@/lib/somnia/somniaBattleClient';

interface UseSomniaBattleHistoryOptions {
  limit?: number;
  pollInterval?: number; // milliseconds
  autoRefresh?: boolean; // Enable real-time polling
}

interface UseSomniaBattleHistoryReturn {
  battleResults: BattleResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to battle results from Somnia DataStreams
 *
 * @param options Configuration options
 * @returns Battle results, loading state, error state, and refresh function
 *
 * @example
 * ```tsx
 * const { battleResults, isLoading, error, refresh } = useSomniaBattleHistory({
 *   limit: 20,
 *   pollInterval: 2000,
 *   autoRefresh: true
 * });
 * ```
 */
export function useSomniaBattleHistory(
  options: UseSomniaBattleHistoryOptions = {}
): UseSomniaBattleHistoryReturn {
  const {
    limit = 50,
    pollInterval = 2000,
    autoRefresh = true,
  } = options;

  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize schema on mount
  useEffect(() => {
    initBattleResultSchema().catch((err) => {
      console.error('[useSomniaBattleHistory] Failed to initialize schema:', err);
      setError('Failed to initialize battle result schema');
    });
  }, []);

  // Fetch battle results
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await fetchBattleResults(limit, 0);

      // Sort by timestamp descending (newest first)
      const sorted = results.sort((a, b) => b.timestamp - a.timestamp);

      setBattleResults(sorted);
    } catch (err) {
      console.error('[useSomniaBattleHistory] Error fetching battle results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch battle results');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Set up real-time subscription if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const unsubscribe = subscribeToBattleResults(
      (newResults) => {
        // Sort by timestamp descending (newest first)
        const sorted = newResults.sort((a, b) => b.timestamp - a.timestamp);
        setBattleResults(sorted);
      },
      pollInterval
    );

    return () => {
      unsubscribe();
    };
  }, [autoRefresh, pollInterval]);

  return {
    battleResults,
    isLoading,
    error,
    refresh,
  };
}
