import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { YieldService } from './yield.service';

@Controller('yield')
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get('pending/:address')
  getPendingYield(@Param('address') address: string) {
    return this.yieldService.getPendingYield(address);
  }

  @Get('property/:propertyId')
  getPropertyYield(@Param('propertyId') propertyId: string) {
    return this.yieldService.getPropertyYield(Number(propertyId));
  }

  @Get('calculate/:propertyId')
  calculateYield(@Param('propertyId') propertyId: string, @Query('days') days?: string) {
    return this.yieldService.calculateYieldWithOracle(propertyId, days ? Number(days) : 1);
  }

  @Get('history/:address')
  getYieldHistory(@Param('address') address: string) {
    return this.yieldService.getYieldHistory(address);
  }

  @Get('time/:address')
  getYieldTimeInfo(@Param('address') address: string) {
    return this.yieldService.getYieldTimeInfo(address);
  }

  @Post('time/:address/broadcast')
  async broadcastYieldTimeUpdate(@Param('address') address: string) {
    const success = await this.yieldService.broadcastYieldTimeUpdateForUser(address);
    if (!success) {
      throw new Error(`Failed to broadcast yield time update for ${address}`);
    }
    return { success: true, message: `Broadcasted yield time update for ${address}` };
  }
}
