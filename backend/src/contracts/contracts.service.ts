import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import PropertyNFTABI from './abis/PropertyNFT.json';
import GameTokenABI from './abis/GameToken.json';
import YieldDistributorABI from './abis/YieldDistributor.json';
import MarketplaceABI from './abis/Marketplace.json';
import QuestSystemABI from './abis/QuestSystem.json';
import TokenSwapABI from './abis/TokenSwap.json';
import { MultiRpcService } from '../mantle/multi-rpc.service';

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ContractsService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  
  public propertyNFT: ethers.Contract;
  public gameToken: ethers.Contract;
  public yieldDistributor: ethers.Contract;
  public marketplace: ethers.Contract;
  public questSystem: ethers.Contract;
  public tokenSwap: ethers.Contract;

  constructor(
    private configService: ConfigService,
    private multiRpcService?: MultiRpcService,
  ) {
    // Don't initialize in constructor - wait for OnModuleInit
  }

  onModuleInit() {
    this.initializeContracts();
  }

  private initializeContracts() {
    try {
      // Use process.env as fallback if ConfigService doesn't have values
      const rpcUrl = this.configService.get<string>('MANTLE_RPC_URL') || process.env.MANTLE_RPC_URL;
      const privateKey = this.configService.get<string>('PRIVATE_KEY') || process.env.PRIVATE_KEY;

      this.logger.log(`[ContractsService] Initializing contracts...`);
      this.logger.log(`[ContractsService] RPC URL: ${rpcUrl ? 'SET' : 'MISSING'}`);
      this.logger.log(`[ContractsService] Private Key: ${privateKey ? 'SET' : 'MISSING'}`);

      if (!rpcUrl || !privateKey) {
        this.logger.error('[ContractsService] Missing MANTLE_RPC_URL or PRIVATE_KEY for contract service.');
        this.logger.error(`[ContractsService] ConfigService MANTLE_RPC_URL: ${this.configService.get<string>('MANTLE_RPC_URL') || 'NOT SET'}`);
        this.logger.error(`[ContractsService] process.env MANTLE_RPC_URL: ${process.env.MANTLE_RPC_URL || 'NOT SET'}`);
        this.logger.error(`[ContractsService] ConfigService PRIVATE_KEY: ${this.configService.get<string>('PRIVATE_KEY') ? 'SET (hidden)' : 'NOT SET'}`);
        this.logger.error(`[ContractsService] process.env PRIVATE_KEY: ${process.env.PRIVATE_KEY ? 'SET (hidden)' : 'NOT SET'}`);
        return;
      }

      // Use MultiRpcService if available, otherwise use single provider
      if (this.multiRpcService) {
        this.provider = this.multiRpcService.getProvider();
        this.logger.log(`Using MultiRpcService with ${this.multiRpcService.getAllRpcUrls().length} endpoints`);
        // Test connectivity on startup
        this.multiRpcService.testConnectivity().catch(err => {
          this.logger.warn('RPC connectivity test failed:', err.message);
        });
      } else {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.logger.log(`Using single RPC provider: ${rpcUrl}`);
      }
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      const propertyNFTAddress = this.configService.get<string>('PROPERTY_NFT_ADDRESS') || process.env.PROPERTY_NFT_ADDRESS;
      const gameTokenAddress = this.configService.get<string>('GAME_TOKEN_ADDRESS') || process.env.GAME_TOKEN_ADDRESS;
      const yieldDistributorAddress = this.configService.get<string>('YIELD_DISTRIBUTOR_ADDRESS') || process.env.YIELD_DISTRIBUTOR_ADDRESS;
      const marketplaceAddress = this.configService.get<string>('MARKETPLACE_ADDRESS') || process.env.MARKETPLACE_ADDRESS;
      const questSystemAddress = this.configService.get<string>('QUEST_SYSTEM_ADDRESS') || process.env.QUEST_SYSTEM_ADDRESS;
      const tokenSwapAddress = this.configService.get<string>('TOKEN_SWAP_ADDRESS') || process.env.TOKEN_SWAP_ADDRESS;

      this.logger.log(`PropertyNFT Address: ${propertyNFTAddress || 'NOT SET'}`);

      if (propertyNFTAddress) {
        // Handle ABI - it might be wrapped in default export or be direct array
        let propertyNFTAbi: any = PropertyNFTABI;
        if (!Array.isArray(propertyNFTAbi)) {
          propertyNFTAbi = (PropertyNFTABI as any).default || (PropertyNFTABI as any).abi || PropertyNFTABI;
        }
        if (!Array.isArray(propertyNFTAbi)) {
          this.logger.error(`PropertyNFT ABI type: ${typeof propertyNFTAbi}, isArray: ${Array.isArray(propertyNFTAbi)}`);
          throw new Error('PropertyNFT ABI is not an array');
        }
        this.propertyNFT = new ethers.Contract(propertyNFTAddress, propertyNFTAbi, this.wallet);
        this.logger.log(`PropertyNFT contract initialized at ${propertyNFTAddress}`);
      } else {
        this.logger.error('PROPERTY_NFT_ADDRESS not set in environment variables');
      }
      
      if (gameTokenAddress) {
        let gameTokenAbi: any = GameTokenABI;
        if (!Array.isArray(gameTokenAbi)) {
          gameTokenAbi = (GameTokenABI as any).default || (GameTokenABI as any).abi || GameTokenABI;
        }
        if (!Array.isArray(gameTokenAbi)) {
          throw new Error('GameToken ABI is not an array');
        }
        this.gameToken = new ethers.Contract(gameTokenAddress, gameTokenAbi, this.wallet);
      }
      if (yieldDistributorAddress) {
        let yieldDistributorAbi: any = YieldDistributorABI;
        if (!Array.isArray(yieldDistributorAbi)) {
          yieldDistributorAbi = (YieldDistributorABI as any).default || (YieldDistributorABI as any).abi || YieldDistributorABI;
        }
        if (!Array.isArray(yieldDistributorAbi)) {
          throw new Error('YieldDistributor ABI is not an array');
        }
        this.yieldDistributor = new ethers.Contract(yieldDistributorAddress, yieldDistributorAbi, this.wallet);
      }
      if (marketplaceAddress) {
        let marketplaceAbi: any = MarketplaceABI;
        if (!Array.isArray(marketplaceAbi)) {
          marketplaceAbi = (MarketplaceABI as any).default || (MarketplaceABI as any).abi || MarketplaceABI;
        }
        if (!Array.isArray(marketplaceAbi)) {
          throw new Error('Marketplace ABI is not an array');
        }
        this.marketplace = new ethers.Contract(marketplaceAddress, marketplaceAbi, this.wallet);
        this.logger.log(`Marketplace contract initialized at ${marketplaceAddress}`);
      } else {
        this.logger.warn('MARKETPLACE_ADDRESS not set in environment variables - marketplace events will not be listened to');
      }
      if (questSystemAddress) {
        let questSystemAbi: any = QuestSystemABI;
        if (!Array.isArray(questSystemAbi)) {
          questSystemAbi = (QuestSystemABI as any).default || (QuestSystemABI as any).abi || QuestSystemABI;
        }
        if (!Array.isArray(questSystemAbi)) {
          throw new Error('QuestSystem ABI is not an array');
        }
        this.questSystem = new ethers.Contract(questSystemAddress, questSystemAbi, this.wallet);
      }
      if (tokenSwapAddress) {
        let tokenSwapAbi: any = TokenSwapABI;
        if (!Array.isArray(tokenSwapAbi)) {
          tokenSwapAbi = (TokenSwapABI as any).default || (TokenSwapABI as any).abi || TokenSwapABI;
        }
        if (!Array.isArray(tokenSwapAbi)) {
          throw new Error('TokenSwap ABI is not an array');
        }
        this.tokenSwap = new ethers.Contract(tokenSwapAddress, tokenSwapAbi, this.wallet);
        this.logger.log(`TokenSwap contract initialized at ${tokenSwapAddress}`);
      }

      if (this.propertyNFT) {
        this.logger.log('Smart contracts initialized successfully with wallet signer.');
      } else {
        this.logger.error('PropertyNFT contract failed to initialize!');
      }
    } catch (error) {
      this.logger.error('Failed to initialize smart contracts:', error);
      this.logger.error('Error details:', error.message, error.stack);
    }
  }

  getProvider(): ethers.providers.JsonRpcProvider {
    // Return current provider (MultiRpcService handles failover internally)
    return this.provider;
  }

  /**
   * Execute contract call with automatic RPC failover
   */
  async executeWithFailover<T>(
    operation: (provider: ethers.providers.JsonRpcProvider) => Promise<T>,
    operationName: string = 'contract call',
  ): Promise<T> {
    if (this.multiRpcService) {
      return this.multiRpcService.executeWithFailover(operation, operationName);
    } else {
      // Fallback to single provider if MultiRpcService not available
      return operation(this.provider);
    }
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  async getProperty(tokenId: bigint) {
    return this.propertyNFT.getProperty(tokenId);
  }

  async getMarketplaceListing(propertyId: number): Promise<{ propertyId: number; seller: string; price: string; isActive: boolean; createdAt: number } | null> {
    try {
      if (!this.marketplace) {
        this.logger.warn('Marketplace contract not initialized');
        return null;
      }
      
      const listing = await this.marketplace.listings(BigInt(propertyId));
      
      // listings mapping returns: (propertyId, seller, price, isActive, createdAt)
      return {
        propertyId: Number(listing[0]),
        seller: listing[1],
        price: listing[2].toString(),
        isActive: listing[3],
        createdAt: Number(listing[4]),
      };
    } catch (error) {
      this.logger.error(`Error getting marketplace listing for property ${propertyId}: ${error.message}`);
      return null;
    }
  }

  async getOwnerProperties(ownerAddress: string) {
    return this.propertyNFT.getOwnerProperties(ownerAddress);
  }

  async getOwnerPropertyCount(ownerAddress: string) {
    return this.propertyNFT.getOwnerPropertyCount(ownerAddress);
  }

  async calculateYield(propertyId: bigint): Promise<bigint> {
    // Validate property ID (allow 0, but check if negative)
    if (propertyId < BigInt(0)) {
      this.logger.warn(`Invalid property ID: ${propertyId}. Property IDs cannot be negative.`);
      return BigInt(0);
    }

    // Check if property exists before calculating yield (property 0 CAN exist)
    try {
      await this.propertyNFT.ownerOf(propertyId);
    } catch (error: any) {
      // Property doesn't exist
      this.logger.warn(`Property ${propertyId} does not exist. Skipping yield calculation.`);
      return BigInt(0);
    }

    try {
      // Use failover mechanism if available
      if (this.multiRpcService) {
        const result = await this.multiRpcService.executeWithFailover(
          async (provider) => {
            // Create a new contract instance with the provider
            const yieldDistributorWithProvider = new ethers.Contract(
              this.yieldDistributor.address,
              this.yieldDistributor.interface,
              provider,
            );
            return await yieldDistributorWithProvider.calculateYield(propertyId);
          },
          `calculateYield(${propertyId})`,
        );
        
        // Convert result to BigInt (same logic as below)
        return this.convertYieldResultToBigInt(result, propertyId);
      }
      
      // Fallback to single provider
      const result = await this.yieldDistributor.calculateYield(propertyId);
      
      return this.convertYieldResultToBigInt(result, propertyId);
    } catch (error: any) {
      // If it's a revert (property doesn't exist or invalid), try fallback calculation
      if (error.code === 'CALL_EXCEPTION' || error.message?.includes('revert')) {
        this.logger.warn(`Property ${propertyId} yield calculation reverted, attempting fallback calculation: ${error.message}`);
        
        try {
          // Fallback: Calculate yield manually using same logic as contract
          return await this.calculateYieldFallback(propertyId);
        } catch (fallbackError: any) {
          this.logger.error(`Fallback calculation also failed for property ${propertyId}: ${fallbackError.message}`);
          return BigInt(0);
        }
      }
      this.logger.error(`Error calling calculateYield for property ${propertyId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fallback yield calculation when contract call reverts
   * Uses same formula as YieldDistributor.calculateYield
   */
  private async calculateYieldFallback(propertyId: bigint): Promise<bigint> {
    try {
      // Get property data
      const propData = await this.getProperty(propertyId);
      if (!propData) {
        this.logger.warn(`Property ${propertyId} data not found for fallback calculation`);
        return BigInt(0);
      }

      // Determine value and yieldRate (check if linked to RWA)
      // Helper to convert ethers.js BigNumber to BigInt
      const toBigInt = (val: any): bigint => {
        if (typeof val === 'bigint') return val;
        if (val && typeof val === 'object' && '_hex' in val) {
          return BigInt(val._hex);
        }
        return BigInt(val.toString());
      };

      let value: bigint;
      let yieldRate: bigint;

      // Extract property data (handle ethers.js BigNumber)
      const propValue = toBigInt(propData.value);
      const propYieldRate = toBigInt(propData.yieldRate);
      const rwaContract = propData.rwaContract;
      const rwaTokenId = propData.rwaTokenId ? toBigInt(propData.rwaTokenId) : BigInt(0);

      if (rwaContract && rwaContract !== '0x0000000000000000000000000000000000000000' && rwaTokenId > BigInt(0)) {
        try {
          // Try to fetch RWA data
          const rwaAbi = [
            'function properties(uint256) external view returns (string name, uint256 value, uint256 monthlyYield, string location, uint256 createdAt, bool isActive)',
            'function getYieldRate(uint256) external view returns (uint256)',
          ];
          
          const providerToUse = this.multiRpcService ? this.multiRpcService.getProvider() : this.provider;
          const rwaContractInstance = new ethers.Contract(rwaContract, rwaAbi, providerToUse);
          
          const rwaProperty = await rwaContractInstance.properties(rwaTokenId);
          const rwaYieldRate = await rwaContractInstance.getYieldRate(rwaTokenId);
          
          const rwaValue = toBigInt(rwaProperty.value);
          const rwaYieldRateBigInt = toBigInt(rwaYieldRate);
          const rwaIsActive = rwaProperty.isActive;
          
          if (rwaIsActive && rwaValue > BigInt(0) && rwaYieldRateBigInt > BigInt(0)) {
            value = rwaValue;
            yieldRate = rwaYieldRateBigInt;
            this.logger.log(`✅ Fallback: Property ${propertyId} using RWA data (value: ${value.toString()}, yieldRate: ${yieldRate.toString()})`);
          } else {
            // RWA not active or invalid, use property data
            value = propValue;
            yieldRate = propYieldRate;
            this.logger.debug(`Fallback: Property ${propertyId} RWA inactive, using property data`);
          }
        } catch (rwaError: any) {
          // RWA fetch failed, use property data
          this.logger.warn(`Fallback: Failed to fetch RWA data for property ${propertyId}, using property data: ${rwaError.message}`);
          value = propValue;
          yieldRate = propYieldRate;
        }
      } else {
        // Not linked to RWA, use property data
        value = propValue;
        yieldRate = propYieldRate;
      }

      // Validate value and yieldRate
      if (value === BigInt(0) || yieldRate === BigInt(0)) {
        this.logger.warn(`Fallback: Property ${propertyId} has invalid value or yieldRate (value: ${value.toString()}, yieldRate: ${yieldRate.toString()})`);
        return BigInt(0);
      }

      // Get lastYieldUpdate (or use createdAt if 0)
      let lastUpdate = BigInt(0);
      try {
        lastUpdate = await this.getLastYieldUpdate(propertyId);
      } catch (error) {
        this.logger.warn(`Fallback: Failed to get lastYieldUpdate for property ${propertyId}, will use createdAt`);
      }

      const createdAt = toBigInt(propData.createdAt);
      const startTimestamp = lastUpdate > BigInt(0) ? lastUpdate : createdAt;

      // Get current block timestamp
      let currentBlockTimestamp = BigInt(Math.floor(Date.now() / 1000)); // Fallback to current time
      try {
        const providerToUse = this.multiRpcService ? this.multiRpcService.getProvider() : this.provider;
        const block = await providerToUse.getBlock('latest');
        currentBlockTimestamp = BigInt(block.timestamp);
      } catch (error) {
        this.logger.warn(`Fallback: Failed to get block timestamp, using current time`);
      }

      // Calculate time elapsed
      let timeSinceUpdate = currentBlockTimestamp - startTimestamp;
      if (timeSinceUpdate < BigInt(0)) {
        this.logger.warn(`Fallback: Negative time elapsed for property ${propertyId}, using 0`);
        timeSinceUpdate = BigInt(0);
      }

      // Cap to 365 days (same as contract)
      const maxTime = BigInt(365 * 24 * 60 * 60); // 365 days in seconds
      if (timeSinceUpdate > maxTime) {
        timeSinceUpdate = maxTime;
      }

      // Get YIELD_UPDATE_INTERVAL
      let yieldUpdateInterval = BigInt(86400); // Default 1 day
      try {
        yieldUpdateInterval = await this.getYieldUpdateInterval();
      } catch (error) {
        this.logger.warn(`Fallback: Failed to get YIELD_UPDATE_INTERVAL, using default 86400 seconds`);
      }

      // If less than 24 hours, return pendingYield (which is 0 for new properties)
      if (timeSinceUpdate < yieldUpdateInterval) {
        this.logger.debug(`Fallback: Property ${propertyId} time elapsed (${timeSinceUpdate.toString()}s) < interval (${yieldUpdateInterval.toString()}s), returning 0`);
        return BigInt(0);
      }

      // Calculate daily yield: (value * yieldRate) / (365 * 10000)
      const dailyYield = (value * yieldRate) / BigInt(365 * 10000);

      // Calculate periods
      let periods = timeSinceUpdate / yieldUpdateInterval;
      if (periods > BigInt(365)) {
        periods = BigInt(365);
      }

      // Calculate total yield: pendingYield + (dailyYield * periods)
      // pendingYield is 0 for new properties, so: dailyYield * periods
      const totalYield = dailyYield * periods;

      this.logger.log(`✅ Fallback: Calculated yield for property ${propertyId}: ${totalYield.toString()} wei (${Number(totalYield) / 1e18} TYCOON)`, {
        value: value.toString(),
        yieldRate: yieldRate.toString(),
        timeSinceUpdate: timeSinceUpdate.toString(),
        periods: periods.toString(),
        dailyYield: dailyYield.toString(),
      });

      return totalYield;
    } catch (error: any) {
      this.logger.error(`Fallback calculation failed for property ${propertyId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert yield result from ethers.js to BigInt
   */
  private convertYieldResultToBigInt(result: any, propertyId: bigint): bigint {
    // Debug: Log the actual result type and structure
    this.logger.debug(`calculateYield result for property ${propertyId}:`, {
      type: typeof result,
      isBigInt: typeof result === 'bigint',
      hasHex: result && typeof result === 'object' && '_hex' in result,
      hasIsBigNumber: result && typeof result === 'object' && '_isBigNumber' in result,
      keys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
    });
    
    // Handle different return types from ethers.js
    let resultBigInt: bigint;
      
      if (typeof result === 'bigint') {
        resultBigInt = result;
      } else if (result && typeof result === 'object') {
        // Handle ethers.js BigNumber - ALWAYS prefer _hex (most reliable, avoids toString() bugs)
        // Check _hex FIRST before anything else
        if ('_hex' in result) {
          // BigNumber with _hex property - this is the most reliable way
          const hexValue = result._hex;
          if (typeof hexValue === 'string' && hexValue.startsWith('0x')) {
            resultBigInt = BigInt(hexValue);
            const resultStr = resultBigInt.toString();
            
            // Validate immediately after conversion - check for corrupted values
            // Normal yield should be < 1,000,000 TYCOON = 1e24 wei = ~24 decimal digits (allows for high-value RWA properties)
            if (resultStr.length > 28) {
              this.logger.error(`Property ${propertyId}: Hex value converts to corrupted number (${resultStr.length} digits). Hex: ${hexValue}. Contract state appears corrupted. Returning 0.`);
              return BigInt(0);
            }
            
            this.logger.debug(`Property ${propertyId}: Using _hex value: ${hexValue} = ${resultStr} wei`);
          } else {
            this.logger.error(`Invalid _hex value for property ${propertyId}: ${hexValue}`);
            return BigInt(0);
          }
        } else if ('_isBigNumber' in result && result._isBigNumber) {
          // ethers v5 BigNumber - try to get hex value
          try {
            const hexValue = (result as any).toHexString();
            if (hexValue && typeof hexValue === 'string' && hexValue.startsWith('0x')) {
              resultBigInt = BigInt(hexValue);
            } else {
              throw new Error('Invalid hex from toHexString()');
            }
          } catch (hexError) {
            this.logger.warn(`Failed to get hex from BigNumber for property ${propertyId}, trying toString()...`);
            // Fallback to toString() but validate carefully
            const resultStr = result.toString();
            if (resultStr.length > 25) {
              this.logger.error(`Suspiciously long yield string for property ${propertyId}: ${resultStr.length} chars. Value likely corrupted.`);
              return BigInt(0);
            }
            if (!/^\d+$/.test(resultStr)) {
              this.logger.error(`Invalid calculateYield result (non-numeric) for property ${propertyId}: ${resultStr}`);
              return BigInt(0);
            }
            resultBigInt = BigInt(resultStr);
          }
        } else if ('toString' in result) {
          // Last resort: toString() - but validate carefully
          const resultStr = result.toString();
          
          // Check for suspicious patterns (repeated digits, too long, etc.)
          if (resultStr.length > 25) {
            this.logger.error(`Suspiciously long yield string for property ${propertyId}: ${resultStr.length} chars. Value likely corrupted. Returning 0.`);
            return BigInt(0);
          }
          
          // Validate it's a valid number string
          if (!/^\d+$/.test(resultStr)) {
            this.logger.error(`Invalid calculateYield result (non-numeric) for property ${propertyId}: ${resultStr}`);
            return BigInt(0);
          }
          resultBigInt = BigInt(resultStr);
        } else {
          this.logger.error(`Unknown result type for property ${propertyId}:`, typeof result, Object.keys(result));
          return BigInt(0);
        }
      } else {
        // Handle string or number
        const resultStr = String(result);
        if (!/^\d+$/.test(resultStr)) {
          this.logger.error(`Invalid calculateYield result (non-numeric) for property ${propertyId}: ${resultStr}`);
          return BigInt(0);
        }
        resultBigInt = BigInt(resultStr);
      }
      
      // Sanity check: yield should be reasonable (< 1,000,000 TYCOON = 1e24 wei)
      // If larger, it's likely corrupted (string concatenation bug)
      // Increased threshold to allow for high-value RWA properties
      const MAX_REASONABLE_YIELD = BigInt('1000000000000000000000000'); // 1,000,000 TYCOON
      if (resultBigInt > MAX_REASONABLE_YIELD) {
        this.logger.error(`Corrupted yield value for property ${propertyId}: ${resultBigInt.toString()} wei. Returning 0.`);
        return BigInt(0);
      }
      
      return resultBigInt;
  }

  async getTotalPendingYield(ownerAddress: string) {
    return this.yieldDistributor.getTotalPendingYield(ownerAddress);
  }

  async getLastYieldUpdate(propertyId: bigint): Promise<bigint> {
    return this.yieldDistributor.lastYieldUpdate(propertyId);
  }

  async getYieldUpdateInterval(): Promise<bigint> {
    if (!this.yieldDistributor) {
      throw new Error('YieldDistributor contract not initialized');
    }
    try {
      // Try calling as a function first (for public constant)
      const result = await this.yieldDistributor.YIELD_UPDATE_INTERVAL();
      return typeof result === 'bigint' ? result : BigInt(result.toString());
    } catch (error: any) {
      // If function call fails, return default (1 day = 86400 seconds)
      this.logger.warn(`Failed to get YIELD_UPDATE_INTERVAL from contract, using default 86400 seconds: ${error.message}`);
      return BigInt(86400); // 1 day in seconds
    }
  }

  async getListing(propertyId: bigint) {
    return this.marketplace.listings(propertyId);
  }

  async getAuction(propertyId: bigint) {
    return this.marketplace.auctions(propertyId);
  }

  async hasCompletedQuest(playerAddress: string, questType: number) {
    return this.questSystem.hasCompletedQuest(playerAddress, questType);
  }

  async getTotalQuestsCompleted(playerAddress: string) {
    return this.questSystem.getTotalQuestsCompleted(playerAddress);
  }

  async getQuest(questType: number) {
    return this.questSystem.quests(questType);
  }

  async getActiveListings() {
    // Note: Marketplace contract doesn't have a getActiveListings function
    // This would need to be implemented by querying events or maintaining an index
    // For now, return empty array - listings are synced via events
    return [];
  }
}

