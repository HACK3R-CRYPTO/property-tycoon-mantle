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
import { ChatModule } from './chat/chat.module';
import { GuildsModule } from './guilds/guilds.module';
import { UsersModule } from './users/users.module';
import { WebsocketModule } from './websocket/websocket.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WebsocketModule,
    DatabaseModule,
    MantleModule,
    ContractsModule,
    PropertiesModule,
    YieldModule,
    MarketplaceModule,
    QuestsModule,
    LeaderboardModule,
    ChatModule,
    GuildsModule,
    UsersModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
