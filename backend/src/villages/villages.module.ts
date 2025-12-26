import { Module } from '@nestjs/common';
import { VillagesService } from './villages.service';
import { VillagesController } from './villages.controller';

@Module({
  providers: [VillagesService],
  controllers: [VillagesController],
  exports: [VillagesService],
})
export class VillagesModule {}
