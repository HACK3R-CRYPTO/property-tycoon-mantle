import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import PropertyNFTABI from './abis/PropertyNFT.json';
import GameTokenABI from './abis/GameToken.json';
import YieldDistributorABI from './abis/YieldDistributor.json';
import MarketplaceABI from './abis/Marketplace.json';
import QuestSystemABI from './abis/QuestSystem.json';

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

  constructor(private configService: ConfigService) {
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

      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      const propertyNFTAddress = this.configService.get<string>('PROPERTY_NFT_ADDRESS') || process.env.PROPERTY_NFT_ADDRESS;
      const gameTokenAddress = this.configService.get<string>('GAME_TOKEN_ADDRESS') || process.env.GAME_TOKEN_ADDRESS;
      const yieldDistributorAddress = this.configService.get<string>('YIELD_DISTRIBUTOR_ADDRESS') || process.env.YIELD_DISTRIBUTOR_ADDRESS;
      const marketplaceAddress = this.configService.get<string>('MARKETPLACE_ADDRESS') || process.env.MARKETPLACE_ADDRESS;
      const questSystemAddress = this.configService.get<string>('QUEST_SYSTEM_ADDRESS') || process.env.QUEST_SYSTEM_ADDRESS;

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
    return this.provider;
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  async getProperty(tokenId: bigint) {
    return this.propertyNFT.getProperty(tokenId);
  }

  async getMarketplaceListing(propertyId: number) {
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
    try {
      const result = await this.yieldDistributor.calculateYield(propertyId);
      
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
            // Normal yield should be < 1000 TYCOON = 1e21 wei = ~21 decimal digits
            if (resultStr.length > 25) {
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
      
      // Sanity check: yield should be reasonable (< 1000 TYCOON = 1e21 wei)
      // If larger, it's likely corrupted (string concatenation bug)
      const MAX_REASONABLE_YIELD = BigInt('1000000000000000000000'); // 1000 TYCOON
      if (resultBigInt > MAX_REASONABLE_YIELD) {
        this.logger.error(`Corrupted yield value for property ${propertyId}: ${resultBigInt.toString()} wei. Returning 0.`);
        // Try to get the value directly using _hex if available
        try {
          const directResult = await this.yieldDistributor.calculateYield(propertyId);
          if (directResult && typeof directResult === 'object' && '_hex' in directResult) {
            const hexValue = directResult._hex;
            if (typeof hexValue === 'string' && hexValue.startsWith('0x')) {
              const correctedValue = BigInt(hexValue);
              if (correctedValue <= MAX_REASONABLE_YIELD) {
                this.logger.log(`Corrected yield for property ${propertyId} using _hex: ${correctedValue.toString()} wei`);
                return correctedValue;
              }
            }
          }
        } catch (retryError) {
          this.logger.warn(`Failed to retry with _hex for property ${propertyId}: ${retryError.message}`);
        }
        return BigInt(0);
      }
      
      return resultBigInt;
    } catch (error) {
      this.logger.error(`Error calling calculateYield for property ${propertyId}: ${error.message}`);
      return BigInt(0);
    }
  }

  async getTotalPendingYield(ownerAddress: string) {
    return this.yieldDistributor.getTotalPendingYield(ownerAddress);
  }

  async getLastYieldUpdate(propertyId: bigint): Promise<bigint> {
    return this.yieldDistributor.lastYieldUpdate(propertyId);
  }

  async getYieldUpdateInterval(): Promise<bigint> {
    return this.yieldDistributor.YIELD_UPDATE_INTERVAL();
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

