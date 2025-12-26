import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private provider: ethers.providers.JsonRpcProvider;

  // Chronicle Oracle addresses on Mantle
  private readonly ORACLE_ADDRESSES = {
    USDC: process.env.CHRONICLE_USDC_ORACLE || '0x...', // Update with actual address
    USDT: process.env.CHRONICLE_USDT_ORACLE || '0x...', // Update with actual address
    ETH: process.env.CHRONICLE_ETH_ORACLE || '0x...', // Update with actual address
    MNT: process.env.CHRONICLE_MNT_ORACLE || '0x...', // Update with actual address
  };

  // Oracle ABI (simplified - Chronicle uses specific interface)
  private readonly ORACLE_ABI = [
    'function read() external view returns (uint256 value, uint256 timestamp)',
    'function getPrice() external view returns (uint256)',
  ];

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz',
    );
  }

  /**
   * Get price from Chronicle Oracle
   */
  async getPrice(oracleAddress: string): Promise<{ price: bigint; timestamp: number }> {
    try {
      const oracle = new ethers.Contract(
        oracleAddress,
        this.ORACLE_ABI,
        this.provider,
      );

      // Try read() first (Chronicle standard)
      try {
        const [value, timestamp] = await oracle.read();
        return {
          price: BigInt(value.toString()),
          timestamp: Number(timestamp),
        };
      } catch {
        // Fallback to getPrice()
        const price = await oracle.getPrice();
        return {
          price: BigInt(price.toString()),
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get price from oracle ${oracleAddress}`, error);
      throw error;
    }
  }

  /**
   * Get USDC price
   */
  async getUSDCPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.USDC);
    return price;
  }

  /**
   * Get USDT price
   */
  async getUSDTPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.USDT);
    return price;
  }

  /**
   * Get ETH price
   */
  async getETHPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.ETH);
    return price;
  }

  /**
   * Get MNT price
   */
  async getMNTPrice(): Promise<bigint> {
    const { price } = await this.getPrice(this.ORACLE_ADDRESSES.MNT);
    return price;
  }

  /**
   * Get property yield rate based on type
   * This would typically come from an RWA oracle or be calculated
   */
  async getPropertyYieldRate(propertyType: string): Promise<number> {
    // Base yield rates by property type
    const baseRates: Record<string, number> = {
      Residential: 5.0, // 5% APY
      Commercial: 8.0, // 8% APY
      Industrial: 12.0, // 12% APY
      Luxury: 15.0, // 15% APY
    };

    const baseRate = baseRates[propertyType] || 5.0;

    // In production, fetch from RWA oracle or adjust based on market conditions
    // For now, return base rate
    return baseRate;
  }

  /**
   * Get RWA property value from oracle
   */
  async getRWAPropertyValue(rwaContract: string, tokenId: string): Promise<bigint> {
    // This would interact with RWA contract to get tokenized property value
    // For MVP, return a mock value
    // In production, integrate with actual RWA oracle
    try {
      // Mock implementation - replace with actual RWA oracle call
      this.logger.warn('Using mock RWA property value - implement actual oracle');
      return BigInt(1000000); // 1M in smallest unit
    } catch (error) {
      this.logger.error('Failed to get RWA property value', error);
      throw error;
    }
  }

  /**
   * Calculate yield amount for a property
   */
  async calculateYieldAmount(
    propertyValue: bigint,
    yieldRate: number,
    days: number = 1,
  ): Promise<bigint> {
    // Calculate daily yield: (value * rate / 100) / 365
    const dailyYield = (propertyValue * BigInt(Math.floor(yieldRate * 100))) / BigInt(36500);
    return dailyYield * BigInt(days);
  }
}

