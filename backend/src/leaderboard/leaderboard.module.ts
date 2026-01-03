import { Module, forwardRef } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, ContractsModule, forwardRef(() => UsersModule)],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
