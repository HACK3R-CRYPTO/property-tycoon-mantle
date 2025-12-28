import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { DatabaseModule } from '../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [DatabaseModule, ContractsModule, PropertiesModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
