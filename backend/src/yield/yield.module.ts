import { Module } from '@nestjs/common';
import { YieldService } from './yield.service';
import { YieldController } from './yield.controller';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';
import { MantleModule } from '../mantle/mantle.module';

@Module({
  imports: [DatabaseModule, ContractsModule, MantleModule],
  controllers: [YieldController],
  providers: [YieldService],
  exports: [YieldService],
})
export class YieldModule {}
