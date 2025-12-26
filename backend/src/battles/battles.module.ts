import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BattlesService } from './battles.service';
import { BattlesController } from './battles.controller';
import { SpectateGateway } from './spectate.gateway';
import { BattleSessionManager } from './battle-session.manager';
import { DatabaseModule } from '../database/database.module';
import { SomniaModule } from '../somnia/somnia.module';

@Module({
  imports: [
    DatabaseModule,
    SomniaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BattlesController],
  providers: [BattlesService, SpectateGateway, BattleSessionManager],
  exports: [BattlesService],
})
export class BattlesModule {}
