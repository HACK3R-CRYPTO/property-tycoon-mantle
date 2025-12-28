import { Controller, Get, Param, Post } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  getActiveListings() {
    return this.marketplaceService.getActiveListings();
  }

  @Post('sync')
  async syncListings() {
    return this.marketplaceService.syncListingsFromBlockchain();
  }

  @Get('debug')
  async debugMarketplace() {
    return this.marketplaceService.debugMarketplaceState();
  }

  @Get('listing/:id')
  getListing(@Param('id') id: string) {
    return this.marketplaceService.getListing(Number(id));
  }
}
