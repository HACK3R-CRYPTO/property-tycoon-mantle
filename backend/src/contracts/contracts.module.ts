import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractsService } from './contracts.service';
import { MantleModule } from '../mantle/mantle.module';

@Module({
  imports: [ConfigModule, MantleModule],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}

