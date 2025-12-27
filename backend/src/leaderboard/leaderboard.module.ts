import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [DatabaseModule, ContractsModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
