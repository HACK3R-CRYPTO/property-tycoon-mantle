import { somniaSdk, PUBLISHER_ADDRESS } from './somniaClient';

// Battle results schema - must match backend
export const BATTLE_RESULT_SCHEMA =
  'uint64 timestamp, string battleId, string attackerId, string defenderId, uint8 stars, uint8 destructionPercentage, uint32 lootGold, uint32 lootElixir, string status';

export const BATTLE_RESULT_SCHEMA_NAME = 'BattleResults';

export interface BattleResult {
  timestamp: number;
  battleId: string;
  attackerId: string;
  defenderId: string;
  stars: number;
  destructionPercentage: number;
  lootGold: number;
  lootElixir: number;
  status: 'completed' | 'abandoned';
}

let battleResultSchemaId: `0x${string}` | null = null;

/**
 * Initialize battle result schema ID (computed from schema string)
 */
export async function initBattleResultSchema(): Promise<`0x${string}`> {
  if (battleResultSchemaId) {
    return battleResultSchemaId;
  }

  try {
    battleResultSchemaId = await somniaSdk.computeSchemaId(BATTLE_RESULT_SCHEMA) as `0x${string}`;
    console.log('[SomniaBattleClient] Battle Result Schema ID:', battleResultSchemaId);
    return battleResultSchemaId;
  } catch (error) {
    console.error('[SomniaBattleClient] Failed to compute battle result schema ID:', error);
    throw error;
  }
}

/**
 * Fetch battle results from Somnia DataStreams
 * @param limit Number of results to fetch (default 50)
 * @param offset Skip this many results (for pagination)
 */
export async function fetchBattleResults(
  limit: number = 50,
  offset: number = 0
): Promise<BattleResult[]> {
  try {
    // Ensure schema ID is initialized
    if (!battleResultSchemaId) {
      await initBattleResultSchema();
    }

    if (!PUBLISHER_ADDRESS) {
      console.warn('[SomniaBattleClient] PUBLISHER_ADDRESS not set, cannot fetch battle results');
      return [];
    }

    console.log('[SomniaBattleClient] Fetching battle results from Somnia...');
    console.log('[SomniaBattleClient] Schema ID:', battleResultSchemaId);
    console.log('[SomniaBattleClient] Publisher:', PUBLISHER_ADDRESS);

    // Fetch data from Somnia Streams
    const results = await somniaSdk.streams.getAllPublisherDataForSchema(
      battleResultSchemaId!,
      PUBLISHER_ADDRESS as `0x${string}`
    );

    console.log('[SomniaBattleClient] Raw results from Somnia:', results);

    if (results instanceof Error) {
      console.error('[SomniaBattleClient] Error fetching battle results:', results);
      return [];
    }

    if (!results || results.length === 0) {
      console.log('[SomniaBattleClient] No battle results found');
      return [];
    }

    // Parse results
    // Response is an array of rows, where each row is an array of fields
    // Schema: uint64 timestamp, string battleId, string attackerId, string defenderId,
    //         uint8 stars, uint8 destructionPercentage, uint32 lootGold, uint32 lootElixir, string status
    const battleResults: BattleResult[] = results.map((row: any) => {
      try {
        // Helper to extract value (handles nested value structure)
        const val = (f: any) => f?.value?.value ?? f?.value;

        return {
          timestamp: Number(val(row[0])),
          battleId: String(val(row[1])),
          attackerId: String(val(row[2])),
          defenderId: String(val(row[3])),
          stars: Number(val(row[4])),
          destructionPercentage: Number(val(row[5])),
          lootGold: Number(val(row[6])),
          lootElixir: Number(val(row[7])),
          status: String(val(row[8])) as 'completed' | 'abandoned',
        };
      } catch (error) {
        console.error('[SomniaBattleClient] Failed to parse battle result:', error);
        return null;
      }
    }).filter((result): result is BattleResult => result !== null);

    console.log(`[SomniaBattleClient] Decoded ${battleResults.length} battle results`);

    // Apply client-side pagination
    const start = offset;
    const end = offset + limit;
    const paginated = battleResults.slice(start, end);

    return paginated;

  } catch (error) {
    console.error('[SomniaBattleClient] Error fetching battle results:', error);
    return [];
  }
}

/**
 * Subscribe to new battle results (polling-based)
 * @param callback Function to call when new results arrive
 * @param pollInterval Polling interval in milliseconds (default 2000ms)
 * @returns Cleanup function to stop polling
 */
export function subscribeToBattleResults(
  callback: (results: BattleResult[]) => void,
  pollInterval: number = 2000
): () => void {
  let lastResultCount = 0;
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const results = await fetchBattleResults(50, 0);

      // Only call callback if we have new results
      if (results.length > lastResultCount) {
        callback(results);
        lastResultCount = results.length;
      }
    } catch (error) {
      console.error('[SomniaBattleClient] Error in subscription poll:', error);
    }

    if (isRunning) {
      setTimeout(poll, pollInterval);
    }
  };

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    isRunning = false;
  };
}
