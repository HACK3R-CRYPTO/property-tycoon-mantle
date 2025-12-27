import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
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

  @Put(':tokenId/coordinates')
  updateCoordinates(
    @Param('tokenId') tokenId: string,
    @Body() body: { x: number; y: number },
  ) {
    return this.propertiesService.updateCoordinates(Number(tokenId), body.x, body.y);
  }
}
