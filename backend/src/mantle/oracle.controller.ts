import { Controller, Get } from '@nestjs/common';
import { OracleService } from './oracle.service';

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Get('mnt-price')
  async getMNTPrice() {
    try {
      const price = await this.oracleService.getMNTPrice();
      // Convert BigInt to string for JSON response
      const priceString = price.toString();
      // Convert from wei (18 decimals) to USD
      const priceInUSD = Number(price) / 1e18;
      // TYCOON/USD = MNT/USD / 100 (since 1 MNT = 100 TYCOON)
      const tycoonPriceUSD = priceInUSD / 100;

      return {
        success: true,
        mntPriceUSD: priceInUSD,
        tycoonPriceUSD: tycoonPriceUSD,
        priceWei: priceString,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch MNT price',
        // Fallback price (approximate MNT price as of Dec 2025)
        mntPriceUSD: 0.98,
        tycoonPriceUSD: 0.0098,
        timestamp: Date.now(),
      };
    }
  }
}


