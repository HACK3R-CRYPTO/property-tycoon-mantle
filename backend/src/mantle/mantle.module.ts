import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MantleSdkService } from './mantle-sdk.service';
import { OracleService } from './oracle.service';
import { MantleApiService } from './mantle-api.service';
import { MantleGasService } from './mantle-gas.service';
import { OracleController } from './oracle.controller';
import { PriceUpdateService } from './price-update.service';
import { MultiRpcService } from './multi-rpc.service';

@Module({
  imports: [ConfigModule],
  controllers: [OracleController],
  providers: [
    MantleSdkService,
    OracleService,
    MantleApiService,
    MantleGasService,
    PriceUpdateService,
    MultiRpcService,
  ],
  exports: [MantleSdkService, OracleService, MantleApiService, MantleGasService, MultiRpcService],
})
export class MantleModule {}

