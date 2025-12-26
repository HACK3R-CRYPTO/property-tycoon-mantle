import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { VillagesService } from '../../villages/villages.service';

export interface JwtPayload {
  sub: string; // user id
  username: string;
  villageId?: string; // Optional for backwards compatibility
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private villagesService: VillagesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get villageId if not in payload (for backwards compatibility)
    let villageId = payload.villageId;
    if (!villageId) {
      const village = await this.villagesService.findByUserId(user.id);
      villageId = village?.id;
    }

    return {
      userId: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      villageId: villageId,
      createdAt: user.createdAt,
    };
  }
}
