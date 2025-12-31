import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

/**
 * Multi-RPC Provider Service
 * Automatically fails over to backup RPC endpoints when primary fails
 */
@Injectable()
export class MultiRpcService {
  private readonly logger = new Logger(MultiRpcService.name);
  private providers: ethers.providers.JsonRpcProvider[] = [];
  private currentProviderIndex: number = 0;
  private readonly rpcEndpoints: string[];

  constructor() {
    // Mantle Sepolia Testnet RPC endpoints (in priority order)
    // Can be overridden via MANTLE_RPC_URLS env var (comma-separated)
    const customRpcUrls = process.env.MANTLE_RPC_URLS;
    
    if (customRpcUrls) {
      this.rpcEndpoints = customRpcUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
      this.logger.log(`Using custom RPC endpoints from MANTLE_RPC_URLS: ${this.rpcEndpoints.length} endpoints`);
    } else {
      // Default fallback chain for Mantle Sepolia Testnet
      this.rpcEndpoints = [
        process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz', // Official (primary)
        'https://rpc.ankr.com/mantle_sepolia', // Ankr (backup 1)
        'https://mantle-sepolia.drpc.org', // DRPC (backup 2)
        'https://rpc.sepolia.mantle.xyz', // Official (fallback)
      ];
      this.logger.log(`Using default RPC endpoints: ${this.rpcEndpoints.length} endpoints`);
    }

    // Initialize all providers
    this.providers = this.rpcEndpoints.map((url, index) => {
      const provider = new ethers.providers.JsonRpcProvider(url);
      this.logger.log(`Initialized RPC provider ${index + 1}/${this.rpcEndpoints.length}: ${url}`);
      return provider;
    });

    if (this.providers.length === 0) {
      throw new Error('No RPC endpoints configured');
    }
  }

  /**
   * Get the current active provider
   */
  getProvider(): ethers.providers.JsonRpcProvider {
    return this.providers[this.currentProviderIndex];
  }

  /**
   * Execute a function with automatic RPC failover
   * Tries each RPC endpoint in order until one succeeds
   */
  async executeWithFailover<T>(
    operation: (provider: ethers.providers.JsonRpcProvider) => Promise<T>,
    operationName: string = 'operation',
  ): Promise<T> {
    const startIndex = this.currentProviderIndex;
    let lastError: Error | null = null;

    // Try all providers starting from current
    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const providerIndex = (startIndex + attempt) % this.providers.length;
      const provider = this.providers[providerIndex];
      const rpcUrl = this.rpcEndpoints[providerIndex];

      try {
        const result = await operation(provider);
        
        // If successful and we switched providers, log it
        if (providerIndex !== this.currentProviderIndex) {
          this.currentProviderIndex = providerIndex;
          this.logger.log(`✅ Switched to RPC endpoint ${providerIndex + 1}/${this.rpcEndpoints.length}: ${rpcUrl}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || error.toString();
        
        // Log the failure but continue to next provider
        this.logger.warn(
          `⚠️ RPC endpoint ${providerIndex + 1}/${this.rpcEndpoints.length} failed for ${operationName}: ${errorMsg.substring(0, 100)}`,
        );
        
        // If this was the current provider, switch to next
        if (providerIndex === this.currentProviderIndex) {
          this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
          this.logger.log(
            `🔄 Failing over to RPC endpoint ${this.currentProviderIndex + 1}/${this.rpcEndpoints.length}: ${this.rpcEndpoints[this.currentProviderIndex]}`,
          );
        }
      }
    }

    // All providers failed
    this.logger.error(`❌ All ${this.providers.length} RPC endpoints failed for ${operationName}`);
    throw lastError || new Error(`All RPC endpoints failed for ${operationName}`);
  }

  /**
   * Test connectivity to all RPC endpoints
   */
  async testConnectivity(): Promise<void> {
    this.logger.log('Testing RPC endpoint connectivity...');
    
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const rpcUrl = this.rpcEndpoints[i];
      
      try {
        const blockNumber = await provider.getBlockNumber();
        this.logger.log(`✅ RPC ${i + 1}/${this.providers.length} (${rpcUrl}): Connected - Block #${blockNumber}`);
      } catch (error: any) {
        this.logger.warn(`❌ RPC ${i + 1}/${this.providers.length} (${rpcUrl}): Failed - ${error.message}`);
      }
    }
  }

  /**
   * Get current RPC endpoint URL
   */
  getCurrentRpcUrl(): string {
    return this.rpcEndpoints[this.currentProviderIndex];
  }

  /**
   * Get all RPC endpoint URLs
   */
  getAllRpcUrls(): string[] {
    return [...this.rpcEndpoints];
  }
}


