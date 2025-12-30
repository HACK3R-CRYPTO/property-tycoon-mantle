import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService, UserProfileDto } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/:walletAddress')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: Object })
  async getProfile(@Param('walletAddress') walletAddress: string): Promise<UserProfileDto | null> {
    return this.usersService.getProfile(walletAddress);
  }

  @Put('profile/:walletAddress/username')
  @ApiOperation({ summary: 'Update username' })
  @ApiResponse({ status: 200, description: 'Username updated successfully' })
  async updateUsername(
    @Param('walletAddress') walletAddress: string,
    @Body('username') username: string,
  ): Promise<UserProfileDto> {
    return this.usersService.updateUsername(walletAddress, username);
  }
}

