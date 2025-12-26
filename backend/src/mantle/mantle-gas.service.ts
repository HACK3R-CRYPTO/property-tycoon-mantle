import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { MantleApiService } from './mantle-api.service';

/**
 * Service for optimizing gas usage on Mantle Network
 * Uses Mantle's GasPriceOracle and custom RPC methods
 */
@Injectable()
export class MantleGasService {
  private readonly logger = new Logger(MantleGasService.name);
  private readonly gasPriceOracleAddress = '0x420000000000000000000000000000000000000F';
  private provider: ethers.providers.JsonRpcProvider;
  private gasPriceOracle: ethers.Contract;

  constructor(
    private configService: ConfigService,
    private mantleApiService: MantleApiService,
  ) {
    this.initializeGasOracle();
  }

  private initializeGasOracle() {
    const rpcUrl = this.configService.get<string>('MANTLE_RPC_URL');
    if (!rpcUrl) {
      this.logger.warn('MANTLE_RPC_URL not set, gas optimization disabled');
      return;
    }

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // GasPriceOracle ABI
    const gasPriceOracleABI = [
      'function l1BaseFee() view returns (uint256)',
      'function gasPrice() view returns (uint256)',
      'function getL1GasUsed(bytes memory _data) view returns (uint256)',
      'function getL1Fee(bytes memory _data) view returns (uint256)',
    ];

    this.gasPriceOracle = new ethers.Contract(
      this.gasPriceOracleAddress,
      gasPriceOracleABI,
      this.provider,
    );
  }

  /**
   * Get optimized gas price for Mantle L2 transactions
   * Returns both L1 base fee and L2 gas price
   */
  async getOptimizedGasPrice(): Promise<{
    l1BaseFee: bigint;
    l2GasPrice: bigint;
    totalEstimate: bigint;
  }> {
    try {
      const l1BaseFee = await this.gasPriceOracle.l1BaseFee();
      const l2GasPrice = await this.gasPriceOracle.gasPrice();
      
      // Estimate total cost (simplified - actual cost depends on transaction data)
      const totalEstimate = l1BaseFee.add(l2GasPrice);

      return {
        l1BaseFee: BigInt(l1BaseFee.toString()),
        l2GasPrice: BigInt(l2GasPrice.toString()),
        totalEstimate: BigInt(totalEstimate.toString()),
      };
    } catch (error) {
      this.logger.error('Failed to get optimized gas price', error);
      throw error;
    }
  }

  /**
   * Estimate L1 fee for a transaction
   * Useful for calculating total cost of cross-chain operations
   */
  async estimateL1Fee(transactionData: string): Promise<bigint> {
    try {
      const l1Fee = await this.gasPriceOracle.getL1Fee(transactionData);
      return BigInt(l1Fee.toString());
    } catch (error) {
      this.logger.error('Failed to estimate L1 fee', error);
      throw error;
    }
  }

  /**
   * Get formatted gas prices for display
   */
  async getFormattedGasPrices() {
    try {
      const gasPrices = await this.getOptimizedGasPrice();
      
      return {
        l1BaseFee: {
          wei: gasPrices.l1BaseFee.toString(),
          gwei: ethers.utils.formatUnits(gasPrices.l1BaseFee.toString(), 'gwei'),
          ether: ethers.utils.formatEther(gasPrices.l1BaseFee.toString()),
        },
        l2GasPrice: {
          wei: gasPrices.l2GasPrice.toString(),
          gwei: ethers.utils.formatUnits(gasPrices.l2GasPrice.toString(), 'gwei'),
          ether: ethers.utils.formatEther(gasPrices.l2GasPrice.toString()),
        },
        totalEstimate: {
          wei: gasPrices.totalEstimate.toString(),
          gwei: ethers.utils.formatUnits(gasPrices.totalEstimate.toString(), 'gwei'),
          ether: ethers.utils.formatEther(gasPrices.totalEstimate.toString()),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get formatted gas prices', error);
      throw error;
    }
  }

  /**
   * Check if Mantle node is synced before submitting transactions
   */
  async isNodeReady(): Promise<boolean> {
    try {
      return await this.mantleApiService.isNodeSynced();
    } catch (error) {
      this.logger.error('Failed to check node sync status', error);
      return false;
    }
  }
}

