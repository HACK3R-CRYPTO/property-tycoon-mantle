import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VillagesService } from './villages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('villages')
@Controller('villages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VillagesController {
  constructor(private villagesService: VillagesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user village with details' })
  @ApiResponse({ status: 200, description: 'Village details retrieved' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  async getMyVillage(@Req() req) {
    return this.villagesService.getVillageWithDetails(req.user.userId);
  }
}
