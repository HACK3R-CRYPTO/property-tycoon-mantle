import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { GuildsService } from './guilds.service';

@Controller('guilds')
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Post()
  createGuild(@Body() body: { ownerId: string; name: string; description?: string; isPublic?: boolean }) {
    return this.guildsService.createGuild(body.ownerId, body.name, body.description, body.isPublic ?? true);
  }

  @Get('leaderboard')
  getGuildLeaderboard(@Query('limit') limit?: string) {
    return this.guildsService.getGuildLeaderboard(limit ? Number(limit) : 20);
  }

  @Get('search')
  searchGuilds(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.guildsService.searchGuilds(query, limit ? Number(limit) : 20);
  }

  @Get(':id')
  getGuild(@Param('id') id: string) {
    return this.guildsService.getGuild(id);
  }

  @Get('user/:userId')
  getUserGuild(@Param('userId') userId: string) {
    return this.guildsService.getUserGuild(userId);
  }

  @Post(':guildId/join')
  joinGuild(@Param('guildId') guildId: string, @Body() body: { userId: string }) {
    return this.guildsService.joinGuild(body.userId, guildId);
  }

  @Delete(':guildId/leave')
  leaveGuild(@Param('guildId') guildId: string, @Body() body: { userId: string }) {
    return this.guildsService.leaveGuild(body.userId, guildId);
  }
}

