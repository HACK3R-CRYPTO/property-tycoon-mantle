import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, forwardRef(() => WebsocketGateway)],
  exports: [ChatService],
})
export class ChatModule {}

