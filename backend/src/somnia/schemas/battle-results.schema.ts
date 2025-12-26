/**
 * Somnia DataStreams schema for battle results
 *
 * Stores final battle outcomes for permanent, decentralized history.
 * Published once per battle when battle ends.
 */

export const BATTLE_RESULT_SCHEMA =
  'uint64 timestamp, string battleId, string attackerId, string defenderId, uint8 stars, uint8 destructionPercentage, uint32 lootGold, uint32 lootElixir, string status';

/**
 * Schema name for registration
 */
export const BATTLE_RESULT_SCHEMA_NAME = 'BattleResults';

/**
 * Battle result data structure
 */
export interface BattleResultData {
  timestamp: number;
  battleId: string;
  attackerId: string; // Username (not ID)
  defenderId: string; // Username (not ID)
  stars: number; // 0-3
  destructionPercentage: number; // 0-100
  lootGold: number;
  lootElixir: number;
  status: 'completed' | 'abandoned';
}
