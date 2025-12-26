import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CrossChainMessenger, L1ChainID, L2ChainID } from '@mantleio/sdk';
import { ethers } from 'ethers';

@Injectable()
export class MantleSdkService implements OnModuleInit {
  private readonly logger = new Logger(MantleSdkService.name);
  private messenger: CrossChainMessenger | null = null;

  async onModuleInit() {
    await this.initializeMessenger();
  }

  private async initializeMessenger() {
    try {
      // Initialize providers
      const l1Provider = new ethers.providers.JsonRpcProvider(
        process.env.L1_RPC_URL || 'https://eth.llamarpc.com',
      );
      const l2Provider = new ethers.providers.JsonRpcProvider(
        process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz',
      );

      // Create cross-chain messenger
      this.messenger = new CrossChainMessenger({
        l1SignerOrProvider: l1Provider,
        l2SignerOrProvider: l2Provider,
        l1ChainId: L1ChainID.MAINNET,
        l2ChainId: L2ChainID.MANTLE,
      });

      this.logger.log('Mantle SDK CrossChainMessenger initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Mantle SDK', error);
    }
  }

  /**
   * Get cross-chain messenger instance
   */
  getMessenger(): CrossChainMessenger | null {
    return this.messenger;
  }

  /**
   * Check if messenger is ready
   */
  isReady(): boolean {
    return this.messenger !== null;
  }

  /**
   * Get L1 to L2 message status
   */
  async getMessageStatus(messageHash: string) {
    if (!this.messenger) {
      throw new Error('Messenger not initialized');
    }

    try {
      const status = await this.messenger.getMessageStatus(messageHash);
      return status;
    } catch (error) {
      this.logger.error('Failed to get message status', error);
      throw error;
    }
  }

  /**
   * Estimate gas for depositing ETH to Mantle L2
   * Note: Mantle SDK API varies - this is a placeholder implementation
   * Adjust based on actual @mantleio/sdk version and API
   */
  async estimateDepositGas(amount: string, tokenAddress?: string) {
    if (!this.messenger) {
      throw new Error('Messenger not initialized');
    }

    try {
      const parsedAmount = ethers.utils.parseEther(amount);
      this.logger.log(`Estimating gas for deposit: ${amount}`);
      
      // TODO: Implement actual Mantle SDK gas estimation
      // The exact API depends on the @mantleio/sdk version
      // For now, return a reasonable estimate
      // Standard L2 deposit typically costs ~50k-100k gas
      const estimatedGas = tokenAddress ? '100000' : '80000';
      
      this.logger.log(`Estimated gas: ${estimatedGas}`);
      return estimatedGas;
    } catch (error) {
      this.logger.error('Failed to estimate deposit gas', error);
      // Return a default estimate if SDK method fails
      return '100000'; // Conservative estimate for L2 deposit
    }
  }

  /**
   * Get withdrawal status for L2 to L1 withdrawals
   */
  async getWithdrawalStatus(txHash: string) {
    if (!this.messenger) {
      throw new Error('Messenger not initialized');
    }

    try {
      const status = await this.messenger.getMessageStatus(txHash);
      return status;
    } catch (error) {
      this.logger.error('Failed to get withdrawal status', error);
      throw error;
    }
  }

  /**
   * Get L2 block number
   */
  async getL2BlockNumber(): Promise<number> {
    if (!this.messenger) {
      throw new Error('Messenger not initialized');
    }

    try {
      const blockNumber = await this.messenger.l2Provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      this.logger.error('Failed to get L2 block number', error);
      throw error;
    }
  }

  /**
   * Get L1 block number
   */
  async getL1BlockNumber(): Promise<number> {
    if (!this.messenger) {
      throw new Error('Messenger not initialized');
    }

    try {
      const blockNumber = await this.messenger.l1Provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      this.logger.error('Failed to get L1 block number', error);
      throw error;
    }
  }
}

