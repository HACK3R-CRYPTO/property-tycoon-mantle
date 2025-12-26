import { Module } from '@nestjs/common';
import { SomniaService } from './somnia.service';
import { ChatController } from '../chat/chat.controller';

@Module({
  providers: [SomniaService],
  controllers: [ChatController],
  exports: [SomniaService],
})
export class SomniaModule {}
