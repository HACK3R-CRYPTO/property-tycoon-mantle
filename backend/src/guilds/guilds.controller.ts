import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuildsService } from './guilds.service';

@ApiTags('guilds')
@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guilds' })
  @ApiResponse({ status: 200, description: 'List of guilds' })
  async getAllGuilds(@Query('query') query?: string) {
    return this.guildsService.searchGuilds(query || '', 20);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get guild leaderboard' })
  @ApiResponse({ status: 200, description: 'Guild leaderboard' })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.guildsService.getGuildLeaderboard(limit || 20);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new guild' })
  @ApiResponse({ status: 201, description: 'Guild created successfully' })
  async createGuild(
    @Body('walletAddress') walletAddress: string,
    @Body('ownerId') ownerId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('isPublic') isPublic?: boolean,
  ) {
    // Support both walletAddress and ownerId for backward compatibility
    if (walletAddress) {
      return this.guildsService.createGuildByWallet(walletAddress.toLowerCase(), name, description, isPublic);
    }
    return this.guildsService.createGuild(ownerId, name, description, isPublic);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guild by ID' })
  @ApiResponse({ status: 200, description: 'Guild details' })
  async getGuildById(@Param('id') id: string) {
    return this.guildsService.getGuild(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a guild' })
  @ApiResponse({ status: 201, description: 'Joined guild successfully' })
  async joinGuild(
    @Param('id') id: string, 
    @Body('walletAddress') walletAddress: string,
    @Body('userId') userId?: string,
  ) {
    // Support both walletAddress and userId for backward compatibility
    if (walletAddress) {
      return this.guildsService.joinGuildByWallet(walletAddress.toLowerCase(), id);
    }
    if (userId) {
      return this.guildsService.joinGuild(userId, id);
    }
    throw new Error('Either walletAddress or userId is required');
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a guild' })
  @ApiResponse({ status: 200, description: 'Left guild successfully' })
  async leaveGuild(
    @Param('id') id: string, 
    @Body('walletAddress') walletAddress?: string,
    @Body('userId') userId?: string,
  ) {
    // Support both walletAddress and userId for backward compatibility
    if (walletAddress) {
      return this.guildsService.leaveGuildByWallet(walletAddress.toLowerCase(), id);
    }
    if (userId) {
      return this.guildsService.leaveGuild(userId, id);
    }
    throw new Error('Either walletAddress or userId is required');
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user guild' })
  @ApiResponse({ status: 200, description: 'User guild' })
  async getUserGuild(@Param('userId') userId: string) {
    return this.guildsService.getUserGuild(userId);
  }

  @Get('wallet/:walletAddress')
  @ApiOperation({ summary: 'Get user guild by wallet address' })
  @ApiResponse({ status: 200, description: 'User guild' })
  async getUserGuildByWallet(@Param('walletAddress') walletAddress: string) {
    return this.guildsService.getUserGuildByWallet(walletAddress.toLowerCase());
  }

  @Post(':id/update-stats')
  @ApiOperation({ summary: 'Manually update guild stats' })
  @ApiResponse({ status: 200, description: 'Guild stats updated' })
  async updateGuildStats(@Param('id') id: string) {
    await this.guildsService.updateGuildStats(id);
    return { success: true, message: 'Guild stats updated' };
  }
}

