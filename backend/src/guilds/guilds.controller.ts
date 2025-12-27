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
    @Body('ownerId') ownerId: string,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('isPublic') isPublic?: boolean,
  ) {
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
  async joinGuild(@Param('id') id: string, @Body('userId') userId: string) {
    return this.guildsService.joinGuild(userId, id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a guild' })
  @ApiResponse({ status: 200, description: 'Left guild successfully' })
  async leaveGuild(@Param('id') id: string, @Body('userId') userId: string) {
    return this.guildsService.leaveGuild(userId, id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user guild' })
  @ApiResponse({ status: 200, description: 'User guild' })
  async getUserGuild(@Param('userId') userId: string) {
    return this.guildsService.getUserGuild(userId);
  }
}

