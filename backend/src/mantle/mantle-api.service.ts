import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MantleApiService {
  private readonly logger = new Logger(MantleApiService.name);
  private readonly rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz';
  }

  /**
   * Get block range using Mantle's custom eth_getBlockRange method
   * More efficient than multiple eth_getBlockByNumber calls
   */
  async getBlockRange(
    startBlock: number | string,
    endBlock: number | string,
    includeTransactions: boolean = false,
  ) {
    try {
      const startHex = typeof startBlock === 'number' 
        ? `0x${startBlock.toString(16)}` 
        : startBlock;
      const endHex = typeof endBlock === 'number' 
        ? `0x${endBlock.toString(16)}` 
        : endBlock;

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockRange',
          params: [startHex, endHex, includeTransactions],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      this.logger.error('Failed to get block range', error);
      throw error;
    }
  }

  /**
   * Get rollup info using Mantle's custom rollup_getInfo method
   */
  async getRollupInfo() {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'rollup_getInfo',
          params: [],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      this.logger.error('Failed to get rollup info', error);
      throw error;
    }
  }

  /**
   * Check if node is synced
   */
  async isNodeSynced(): Promise<boolean> {
    try {
      const info = await this.getRollupInfo();
      return !info.syncing;
    } catch (error) {
      this.logger.error('Failed to check node sync status', error);
      return false;
    }
  }

  /**
   * Get L1 block number from rollup info
   */
  async getL1BlockNumber(): Promise<number> {
    try {
      const info = await this.getRollupInfo();
      return info.ethContext?.blockNumber || 0;
    } catch (error) {
      this.logger.error('Failed to get L1 block number', error);
      return 0;
    }
  }

  /**
   * Get L2 transaction index
   */
  async getL2Index(): Promise<number> {
    try {
      const info = await this.getRollupInfo();
      return info.rollupContext?.index || 0;
    } catch (error) {
      this.logger.error('Failed to get L2 index', error);
      return 0;
    }
  }
}

