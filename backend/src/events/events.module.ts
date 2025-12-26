import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventIndexerService } from './event-indexer.service';
import { ContractsModule } from '../contracts/contracts.module';
import { DatabaseModule } from '../database/database.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MantleModule } from '../mantle/mantle.module';

@Module({
  imports: [ConfigModule, ContractsModule, DatabaseModule, MantleModule],
  providers: [EventIndexerService, WebsocketGateway],
  exports: [EventIndexerService],
})
export class EventsModule {}

