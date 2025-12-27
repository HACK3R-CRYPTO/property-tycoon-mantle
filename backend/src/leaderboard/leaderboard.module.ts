import { Module, forwardRef } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { DatabaseModule } from '../database/database.module';
import { PropertiesModule } from '../properties/properties.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PropertiesModule), ContractsModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
