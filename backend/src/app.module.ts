import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MantleModule } from './mantle/mantle.module';
import { ContractsModule } from './contracts/contracts.module';
import { PropertiesModule } from './properties/properties.module';
import { YieldModule } from './yield/yield.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { QuestsModule } from './quests/quests.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MantleModule,
    ContractsModule,
    PropertiesModule,
    YieldModule,
    MarketplaceModule,
    QuestsModule,
    LeaderboardModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway],
})
export class AppModule {}
