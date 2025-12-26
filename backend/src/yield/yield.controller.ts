import { Controller, Get, Param } from '@nestjs/common';
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

  @Get('history/:address')
  getYieldHistory(@Param('address') address: string) {
    return this.yieldService.getYieldHistory(address);
  }
}
