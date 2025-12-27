import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';
import { OracleService } from '../mantle/oracle.service';
import { MantleApiService } from '../mantle/mantle-api.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ethers } from 'ethers';

@Injectable()
export class YieldService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YieldService.name);

  private yieldTimeUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
    private oracleService: OracleService,
    private mantleApiService: MantleApiService,
    private websocketGateway: WebsocketGateway,
  ) {}

  onModuleInit() {
    // Start periodic yield time updates every 60 seconds
    this.startYieldTimeUpdates();
  }

  onModuleDestroy() {
    if (this.yieldTimeUpdateInterval) {
      clearInterval(this.yieldTimeUpdateInterval);
    }
  }

  private startYieldTimeUpdates() {
    // Update every 60 seconds (1 minute)
    this.yieldTimeUpdateInterval = setInterval(async () => {
      try {
        await this.broadcastYieldTimeUpdates();
      } catch (error) {
        this.logger.error(`Error broadcasting yield time updates: ${error.message}`);
      }
    }, 60000); // 60 seconds
  }

  private async broadcastYieldTimeUpdates() {
    try {
      // Get all users with properties
      const users = await this.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
        })
        .from(schema.users)
        .limit(100); // Limit to avoid overload

      for (const user of users) {
        try {
          const yieldTimeInfo = await this.getYieldTimeInfo(user.walletAddress);
          // Check if yieldTimeInfo is valid and has all required properties
          if (yieldTimeInfo && 
              yieldTimeInfo.properties.length > 0 &&
              yieldTimeInfo.yieldUpdateIntervalSeconds !== undefined &&
              yieldTimeInfo.currentBlockTimestamp !== undefined &&
              yieldTimeInfo.totalClaimableYield !== undefined) {
            // Use the gateway method to emit yield time update
            this.websocketGateway.emitYieldTimeUpdate(yieldTimeInfo);
            this.logger.log(`Broadcasted yield time update to ${user.walletAddress} (${yieldTimeInfo.properties.length} properties)`);
          }
        } catch (error) {
          this.logger.warn(`Failed to get yield time info for ${user.walletAddress}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in broadcastYieldTimeUpdates: ${error.message}`);
    }
  }

  async broadcastYieldTimeUpdateForUser(walletAddress: string) {
    try {
      const yieldTimeInfo = await this.getYieldTimeInfo(walletAddress);
      if (yieldTimeInfo && 
          yieldTimeInfo.properties.length > 0 &&
          yieldTimeInfo.yieldUpdateIntervalSeconds !== undefined &&
          yieldTimeInfo.currentBlockTimestamp !== undefined &&
          yieldTimeInfo.totalClaimableYield !== undefined) {
        this.websocketGateway.emitYieldTimeUpdate(yieldTimeInfo);
        this.logger.log(`Manually broadcasted yield time update to ${walletAddress} (${yieldTimeInfo.properties.length} properties)`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error broadcasting yield time update for ${walletAddress}: ${error.message}`);
      return false;
    }
  }

  async getPendingYield(walletAddress: string) {
    try {
      // First try to get from contract
      let totalYield = BigInt(0);
      try {
        totalYield = await this.contractsService.getTotalPendingYield(walletAddress);
      } catch (error) {
        this.logger.warn(`Contract yield calculation failed, calculating from database: ${error.message}`);
      }

      // If contract returns 0 or fails, calculate from database
      if (totalYield === BigInt(0)) {
        const [user] = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
          .limit(1);

        if (user) {
          const properties = await this.db
            .select()
            .from(schema.properties)
            .where(eq(schema.properties.ownerId, user.id));

          const now = new Date();
          for (const property of properties) {
            if (property.createdAt) {
              const createdAt = new Date(property.createdAt);
              const timeElapsedMs = now.getTime() - createdAt.getTime();
              const timeElapsedSeconds = timeElapsedMs / 1000;
              
              // Calculate estimated yield in real-time (by seconds) for engagement
              // This shows players what's accumulating, even though claimable yield requires 24 hours
              // This creates anticipation and engagement while respecting the daily yield mechanic
              if (timeElapsedSeconds > 0) {
                const propertyValue = BigInt(property.value.toString());
                const yieldRate = property.yieldRate || 500;
                
                // Calculate daily yield: (value * yieldRate) / (365 * 10000)
                // Then calculate per-second yield for real-time accumulation display
                const dailyYield = (propertyValue * BigInt(yieldRate)) / BigInt(365 * 10000);
                const secondsPerDay = 86400;
                const yieldPerSecond = dailyYield / BigInt(secondsPerDay);
                
                // Calculate estimated yield for elapsed seconds (cap at 365 days worth)
                // This is for display only - actual claimable yield requires 24 hours (contract enforces this)
                const maxSeconds = 365 * secondsPerDay;
                const secondsToCalculate = Math.min(timeElapsedSeconds, maxSeconds);
                totalYield += yieldPerSecond * BigInt(Math.floor(secondsToCalculate));
              }
            }
          }
        }
      }

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
      // First try to get from contract (if yield has been distributed)
      let yieldAmount = BigInt(0);
      try {
        yieldAmount = await this.contractsService.calculateYield(BigInt(propertyId));
      } catch (error) {
        this.logger.warn(`Contract yield calculation failed, calculating from database: ${error.message}`);
      }

      // If contract returns 0 or fails, calculate from database based on time elapsed
      if (yieldAmount === BigInt(0)) {
        const [property] = await this.db
          .select()
          .from(schema.properties)
          .where(eq(schema.properties.tokenId, propertyId))
          .limit(1);

        if (property && property.createdAt) {
          // Calculate time elapsed since property creation
          const now = new Date();
          const createdAt = new Date(property.createdAt);
          const timeElapsedMs = now.getTime() - createdAt.getTime();
          const timeElapsedSeconds = timeElapsedMs / 1000;
          
          // Calculate estimated yield in real-time (by seconds) for engagement
          // This shows players what's accumulating, even though claimable yield requires 24 hours
          // The contract enforces the 24-hour requirement - this is just for display/engagement
          if (timeElapsedSeconds > 0) {
            // Property value is stored as string (NUMERIC), convert to BigInt
            const propertyValue = BigInt(property.value.toString());
            const yieldRate = property.yieldRate || 500; // Default to 5% (500 basis points)
            
            // Calculate daily yield: (value * yieldRate) / (365 * 10000)
            // Then calculate per-second yield for real-time accumulation display
            const dailyYield = (propertyValue * BigInt(yieldRate)) / BigInt(365 * 10000);
            const secondsPerDay = 86400;
            const yieldPerSecond = dailyYield / BigInt(secondsPerDay);
            
            // Calculate estimated yield for elapsed seconds (cap at 365 days worth)
            // This is for display only - actual claimable yield requires 24 hours (contract enforces this)
            const maxSeconds = 365 * secondsPerDay;
            const secondsToCalculate = Math.min(timeElapsedSeconds, maxSeconds);
            yieldAmount = yieldPerSecond * BigInt(Math.floor(secondsToCalculate));
          }
        }
      }

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
      // Property value is now stored as numeric (string), convert to BigInt for calculations
      const propertyValue = BigInt(property.value.toString());
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

  /**
   * Get yield time information for all properties of a wallet
   * Returns time remaining until yield is claimable for each property
   */
  async getYieldTimeInfo(walletAddress: string) {
    try {
      if (!this.contractsService.yieldDistributor || !this.contractsService.propertyNFT) {
        this.logger.warn('Contracts not initialized');
        return null;
      }

      // Get yield update interval from contract
      const yieldUpdateInterval = await this.contractsService.getYieldUpdateInterval();
      const yieldUpdateIntervalSeconds = Number(yieldUpdateInterval);

      // Get current block timestamp
      const provider = this.contractsService.getProvider();
      const block = await provider.getBlock('latest');
      const currentBlockTimestamp = block.timestamp;

      // Get user's properties from blockchain
      const tokenIds = await this.contractsService.getOwnerProperties(walletAddress);
      if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
        return { walletAddress, properties: [] };
      }

      // Deduplicate tokenIds (convert to numbers, remove duplicates)
      const uniqueTokenIds = Array.from(new Set(tokenIds.map(id => Number(id))));
      this.logger.log(`Found ${tokenIds.length} tokenIds, ${uniqueTokenIds.length} unique for ${walletAddress}`);

      const properties = await Promise.all(
        uniqueTokenIds.map(async (tokenId): Promise<{
          tokenId: number;
          lastYieldUpdate: number;
          createdAt: number;
          timeElapsedSeconds: number;
          timeElapsedHours: number;
          hoursRemaining: number;
          minutesRemaining: number;
          isClaimable: boolean;
          claimableYield: string;
        } | null> => {
          try {
            // Get lastYieldUpdate from contract
            const lastUpdate = await this.contractsService.getLastYieldUpdate(BigInt(Number(tokenId)));
            const lastUpdateTimestamp = Number(lastUpdate);

            // Get property data to get createdAt
            const propData = await this.contractsService.getProperty(BigInt(Number(tokenId)));
            const createdAtTimestamp = Number(propData.createdAt);

            // Determine start timestamp (lastYieldUpdate if > 0, else createdAt)
            const startTimestamp = lastUpdateTimestamp > 0 ? lastUpdateTimestamp : createdAtTimestamp;

            // Calculate time elapsed and remaining
            const timeElapsed = currentBlockTimestamp - startTimestamp;
            const timeElapsedSeconds = timeElapsed;
            const isClaimable = timeElapsedSeconds >= yieldUpdateIntervalSeconds;

            let hoursRemaining = 0;
            let minutesRemaining = 0;
            if (!isClaimable) {
              const timeRemaining = yieldUpdateIntervalSeconds - timeElapsedSeconds;
              hoursRemaining = Math.floor(timeRemaining / 3600);
              minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
            }

            // Get claimable yield from contract
            const claimableYield = await this.contractsService.calculateYield(BigInt(Number(tokenId)));

            return {
              tokenId: Number(tokenId),
              lastYieldUpdate: lastUpdateTimestamp,
              createdAt: createdAtTimestamp,
              timeElapsedSeconds,
              timeElapsedHours: timeElapsedSeconds / 3600,
              hoursRemaining,
              minutesRemaining,
              isClaimable,
              claimableYield: claimableYield.toString(),
            };
          } catch (error) {
            this.logger.warn(`Failed to get yield time info for property ${tokenId}: ${error.message}`);
            return null;
          }
        })
      );

      // Filter out nulls
      const validProperties = properties.filter((p): p is NonNullable<typeof p> => p !== null);

      // Find shortest time remaining
      const nonClaimableProperties = validProperties.filter((p) => !p.isClaimable);
      let shortestTimeRemaining: { hours: number; minutes: number } | null = null;
      if (nonClaimableProperties.length > 0) {
        const shortest = nonClaimableProperties.reduce((min, current) => {
          const minMinutes = min.hoursRemaining * 60 + min.minutesRemaining;
          const currentMinutes = current.hoursRemaining * 60 + current.minutesRemaining;
          return currentMinutes < minMinutes ? current : min;
        });
        shortestTimeRemaining = {
          hours: shortest.hoursRemaining,
          minutes: shortest.minutesRemaining,
        };
      }

      // Calculate total claimable yield
      const totalClaimable = validProperties.reduce((sum, p) => {
        return sum + BigInt(p.claimableYield);
      }, BigInt(0));

      return {
        walletAddress,
        yieldUpdateIntervalSeconds,
        currentBlockTimestamp,
        shortestTimeRemaining,
        totalClaimableYield: totalClaimable.toString(),
        properties: validProperties,
      };
    } catch (error) {
      this.logger.error(`Error getting yield time info: ${error.message}`);
      throw error;
    }
  }
}
