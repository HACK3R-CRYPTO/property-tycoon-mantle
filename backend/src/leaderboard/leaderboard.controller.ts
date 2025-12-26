import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getGlobalLeaderboard(@Query('limit') limit?: string) {
    return this.leaderboardService.getGlobalLeaderboard(limit ? Number(limit) : 100);
  }
}
