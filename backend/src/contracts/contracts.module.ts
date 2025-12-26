import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractsService } from './contracts.service';

@Module({
  imports: [ConfigModule],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}

