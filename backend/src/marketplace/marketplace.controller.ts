import { Controller, Get, Param } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  getActiveListings() {
    return this.marketplaceService.getActiveListings();
  }

  @Get('listing/:id')
  getListing(@Param('id') id: string) {
    return this.marketplaceService.getListing(Number(id));
  }
}
