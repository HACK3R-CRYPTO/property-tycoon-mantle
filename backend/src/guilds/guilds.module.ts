import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [DatabaseModule, ContractsModule],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}


