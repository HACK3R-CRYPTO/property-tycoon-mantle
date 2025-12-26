import { Module } from '@nestjs/common';
import { TroopsController } from './troops.controller';
import { TroopsService } from './troops.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TroopsController],
  providers: [TroopsService],
  exports: [TroopsService],
})
export class TroopsModule {}
