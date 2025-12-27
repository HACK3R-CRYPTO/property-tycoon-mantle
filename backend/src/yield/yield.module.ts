import { Module } from '@nestjs/common';
import { YieldService } from './yield.service';
import { YieldController } from './yield.controller';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';
import { MantleModule } from '../mantle/mantle.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Module({
  imports: [DatabaseModule, ContractsModule, MantleModule],
  controllers: [YieldController],
  providers: [YieldService, WebsocketGateway],
  exports: [YieldService],
})
export class YieldModule {}
