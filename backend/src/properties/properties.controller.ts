import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.propertiesService.findById(id);
  }

  @Get('owner/:address')
  findByOwner(@Param('address') address: string) {
    return this.propertiesService.findByWalletAddress(address);
  }

  @Post('sync/:address')
  syncFromChain(@Param('address') address: string) {
    return this.propertiesService.syncFromChain(address);
  }
}
