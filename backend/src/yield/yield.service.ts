import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';
import { OracleService } from '../mantle/oracle.service';
import { MantleApiService } from '../mantle/mantle-api.service';
import { ethers } from 'ethers';

@Injectable()
export class YieldService {
  private readonly logger = new Logger(YieldService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
    private oracleService: OracleService,
    private mantleApiService: MantleApiService,
  ) {}

  async getPendingYield(walletAddress: string) {
    try {
      const totalYield = await this.contractsService.getTotalPendingYield(walletAddress);
      return {
        totalPending: totalYield.toString(),
        formatted: ethers.utils.formatEther(totalYield.toString()),
      };
    } catch (error) {
      this.logger.error(`Error getting pending yield: ${error.message}`);
      throw error;
    }
  }

  async getPropertyYield(propertyId: number) {
    try {
      const yieldAmount = await this.contractsService.calculateYield(BigInt(propertyId));
      return {
        pending: yieldAmount.toString(),
        formatted: ethers.utils.formatEther(yieldAmount.toString()),
      };
    } catch (error) {
      this.logger.error(`Error getting property yield: ${error.message}`);
      throw error;
    }
  }

  async getYieldHistory(walletAddress: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return [];
    }

    return this.db
      .select()
      .from(schema.yieldRecords)
      .where(eq(schema.yieldRecords.ownerId, user.id))
      .orderBy(schema.yieldRecords.createdAt);
  }

  /**
   * Calculate yield using Oracle service for dynamic rates
   * Uses Mantle's Chronicle Oracle for real-time yield rates
   */
  async calculateYieldWithOracle(propertyId: string, days: number = 1) {
    try {
      const [property] = await this.db
        .select()
        .from(schema.properties)
        .where(eq(schema.properties.id, propertyId))
        .limit(1);

      if (!property) {
        throw new Error('Property not found');
      }

      // Get yield rate from oracle (can be dynamic based on market conditions)
      const yieldRate = await this.oracleService.getPropertyYieldRate(property.propertyType);
      
      // Calculate yield amount
      const propertyValue = BigInt(property.value);
      const yieldAmount = await this.oracleService.calculateYieldAmount(
        propertyValue,
        yieldRate,
        days,
      );

      return {
        yieldAmount: yieldAmount.toString(),
        formatted: ethers.utils.formatEther(yieldAmount.toString()),
        yieldRate,
        days,
      };
    } catch (error) {
      this.logger.error(`Error calculating yield with oracle: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get optimized gas price using Mantle's GasPriceOracle
   */
  async getOptimizedGasPrice() {
    try {
      // Use Mantle API to get L2 gas price
      const l2GasPrice = await this.mantleApiService.getL2GasPrice();
      const l1BaseFee = await this.mantleApiService.getL1BaseFee();
      
      return {
        l2GasPrice: l2GasPrice.toString(),
        l1BaseFee: l1BaseFee.toString(),
        formatted: {
          l2GasPrice: ethers.utils.formatUnits(l2GasPrice.toString(), 'gwei'),
          l1BaseFee: ethers.utils.formatUnits(l1BaseFee.toString(), 'gwei'),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting optimized gas price: ${error.message}`);
      throw error;
    }
  }

  async recordYieldClaim(propertyId: string, ownerId: string, amount: string, txHash: string) {
    const [record] = await this.db
      .insert(schema.yieldRecords)
      .values({
        propertyId,
        ownerId,
        amount: BigInt(amount),
        claimed: true,
        transactionHash: txHash,
        claimedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();
    return record;
  }
}
