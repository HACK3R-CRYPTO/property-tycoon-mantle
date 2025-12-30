import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class PriceUpdateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceUpdateService.name);
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  
  // Update price every 5 minutes (300000 ms)
  private readonly UPDATE_INTERVAL_MS = 5 * 60 * 1000;

  constructor(
    private readonly oracleService: OracleService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Starting price update service...');
    // Fetch and broadcast initial price (with small delay to ensure gateway is ready)
    setTimeout(async () => {
      await this.broadcastPriceUpdate();
    }, 2000);
    // Set up periodic updates
    this.priceUpdateInterval = setInterval(() => {
      this.broadcastPriceUpdate();
    }, this.UPDATE_INTERVAL_MS);
    this.logger.log(`📡 Price updates will be broadcast every ${this.UPDATE_INTERVAL_MS / 1000} seconds`);
  }

  onModuleDestroy() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.logger.log('Price update service stopped');
    }
  }

  private async broadcastPriceUpdate() {
    try {
      const price = await this.oracleService.getMNTPrice();
      // Convert BigInt to number
      const priceInUSD = Number(price) / 1e18;
      // TYCOON/USD = MNT/USD / 100 (since 1 MNT = 100 TYCOON)
      const tycoonPriceUSD = priceInUSD / 100;

      const priceData = {
        mntPriceUSD: priceInUSD,
        tycoonPriceUSD: tycoonPriceUSD,
        timestamp: Date.now(),
      };

      // Broadcast to all connected clients via Socket.io
      this.websocketGateway.emitPriceUpdate(priceData);
      this.logger.log(`💰 Broadcasted price update: MNT/USD = $${priceInUSD.toFixed(4)}, TYCOON/USD = $${tycoonPriceUSD.toFixed(6)}`);
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to fetch price for broadcast: ${error.message}`);
      // Use fallback price
      const fallbackPrice = 0.98;
      const fallbackTycoonPrice = fallbackPrice / 100;
      this.websocketGateway.emitPriceUpdate({
        mntPriceUSD: fallbackPrice,
        tycoonPriceUSD: fallbackTycoonPrice,
        timestamp: Date.now(),
      });
      this.logger.log(`💰 Broadcasted fallback price: MNT/USD = $${fallbackPrice.toFixed(4)}, TYCOON/USD = $${fallbackTycoonPrice.toFixed(6)}`);
    }
  }
}

