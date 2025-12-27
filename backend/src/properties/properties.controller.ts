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
  async syncFromChain(@Param('address') address: string) {
    try {
      const properties = await this.propertiesService.syncFromChain(address);
      // Convert BigInt values to strings for JSON serialization
      const serializedProperties = properties.map(prop => ({
        ...prop,
        value: prop.value?.toString() || prop.value,
        totalYieldEarned: prop.totalYieldEarned?.toString() || prop.totalYieldEarned,
      }));
      return {
        success: true,
        propertiesCount: properties.length,
        properties: serializedProperties,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(':tokenId/coordinates')
  updateCoordinates(
    @Param('tokenId') tokenId: string,
    @Body() body: { x: number; y: number },
  ) {
    return this.propertiesService.updateCoordinates(Number(tokenId), body.x, body.y);
  }

  @Post('sync-all')
  async syncAllFromChain() {
    try {
      const result = await this.propertiesService.syncAllExistingPropertiesFromChain();
      return {
        success: true,
        ...result,
        message: `Synced ${result.synced} properties for ${result.owners} owners`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        message: 'Failed to sync properties. Check backend logs for details.',
      };
    }
  }
}
