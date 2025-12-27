import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getGlobalLeaderboard(@Query('limit') limit?: string) {
    // Always sync from blockchain before returning leaderboard
    // This ensures we have the latest on-chain data
    try {
      await this.leaderboardService.syncAllUsersFromChain();
    } catch (error) {
      // Log but don't fail - return leaderboard even if sync fails
      console.error('Failed to sync users from chain:', error);
    }
    return this.leaderboardService.getGlobalLeaderboard(limit ? Number(limit) : 100);
  }

  @Post('sync/:address')
  async syncAndUpdate(@Param('address') address: string) {
    await this.leaderboardService.syncAndUpdateLeaderboard(address);
    return { success: true, message: 'Leaderboard synced and updated' };
  }
}
