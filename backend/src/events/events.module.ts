import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventIndexerService } from './event-indexer.service';
import { ContractsModule } from '../contracts/contracts.module';
import { DatabaseModule } from '../database/database.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MantleModule } from '../mantle/mantle.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { GuildsModule } from '../guilds/guilds.module';
import { PropertiesModule } from '../properties/properties.module';
import { YieldModule } from '../yield/yield.module';

@Module({
  imports: [
    ConfigModule,
    ContractsModule,
    DatabaseModule,
    MantleModule,
    LeaderboardModule,
    GuildsModule,
    forwardRef(() => PropertiesModule),
    forwardRef(() => YieldModule),
  ],
  providers: [EventIndexerService, WebsocketGateway],
  exports: [EventIndexerService],
})
export class EventsModule {}

