import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getGlobalLeaderboard(@Query('limit') limit?: string) {
    // Return leaderboard directly from database (fast)
    // Sync should be done separately via /sync-all endpoint or event indexer
    // This makes the leaderboard load instantly since data is already synced
    return this.leaderboardService.getGlobalLeaderboard(limit ? Number(limit) : 100);
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
}
