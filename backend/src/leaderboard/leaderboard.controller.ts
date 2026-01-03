import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getGlobalLeaderboard(@Query('limit') limit?: string, @Query('recalculate') recalculate?: string) {
    // Return leaderboard directly from database (fast)
    // If recalculate=true, force recalculation from blockchain (slower but more accurate)
    // Sync should be done separately via /sync-all endpoint or event indexer
    // This makes the leaderboard load instantly since data is already synced
    const forceRecalculate = recalculate === 'true';
    return this.leaderboardService.getGlobalLeaderboard(limit ? Number(limit) : 100, forceRecalculate);
  }

  @Post('sync/:address')
  async syncAndUpdate(@Param('address') address: string) {
    await this.leaderboardService.syncAndUpdateLeaderboard(address);
    return { success: true, message: 'Leaderboard synced and updated' };
  }

  @Post('cleanup-contracts')
  async cleanupContracts() {
    return this.leaderboardService.cleanupContractAddresses();
  }

  @Post('recalculate')
  async recalculateLeaderboard() {
    // Force recalculation from blockchain (removes old data)
    const rankings = await this.leaderboardService.calculateLeaderboardFromBlockchain(100);
    return {
      success: true,
      count: rankings.length,
      message: `Recalculated leaderboard with ${rankings.length} entries from new contract`,
    };
  }

  @Post('clear-and-recalculate')
  async clearAndRecalculate() {
    // Clear all old data and recalculate from new contract only
    const rankings = await this.leaderboardService.clearAndRecalculateLeaderboard(100);
    return {
      success: true,
      count: rankings.length,
      message: `Cleared old data and recalculated leaderboard with ${rankings.length} entries from new contract`,
      rankings,
    };
  }
}
