import { Controller, Get, Query, Post, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getGlobalLeaderboard(@Query('limit') limit?: string) {
    return this.leaderboardService.getGlobalLeaderboard(limit ? Number(limit) : 100);
  }

  @Post('sync/:address')
  async syncAndUpdate(@Param('address') address: string) {
    await this.leaderboardService.syncAndUpdateLeaderboard(address);
    return { success: true, message: 'Leaderboard synced and updated' };
  }
}
