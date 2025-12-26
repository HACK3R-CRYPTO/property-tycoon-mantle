import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MantleSdkService } from './mantle-sdk.service';
import { OracleService } from './oracle.service';
import { MantleApiService } from './mantle-api.service';
import { MantleGasService } from './mantle-gas.service';

@Module({
  imports: [ConfigModule],
  providers: [MantleSdkService, OracleService, MantleApiService, MantleGasService],
  exports: [MantleSdkService, OracleService, MantleApiService, MantleGasService],
})
export class MantleModule {}

