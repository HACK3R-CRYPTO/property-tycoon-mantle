import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as PropertyNFTABI from './abis/PropertyNFT.json';
import * as GameTokenABI from './abis/GameToken.json';
import * as YieldDistributorABI from './abis/YieldDistributor.json';
import * as MarketplaceABI from './abis/Marketplace.json';
import * as QuestSystemABI from './abis/QuestSystem.json';

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
        // Ensure ABI is an array
        const propertyNFTAbi = Array.isArray(PropertyNFTABI) ? PropertyNFTABI : (PropertyNFTABI as any).abi || PropertyNFTABI;
        this.propertyNFT = new ethers.Contract(propertyNFTAddress, propertyNFTAbi, this.wallet);
        this.logger.log(`PropertyNFT contract initialized at ${propertyNFTAddress}`);
      } else {
        this.logger.error('PROPERTY_NFT_ADDRESS not set in environment variables');
      }
      
      if (gameTokenAddress) {
        const gameTokenAbi = Array.isArray(GameTokenABI) ? GameTokenABI : (GameTokenABI as any).abi || GameTokenABI;
        this.gameToken = new ethers.Contract(gameTokenAddress, gameTokenAbi, this.wallet);
      }
      if (yieldDistributorAddress) {
        const yieldDistributorAbi = Array.isArray(YieldDistributorABI) ? YieldDistributorABI : (YieldDistributorABI as any).abi || YieldDistributorABI;
        this.yieldDistributor = new ethers.Contract(yieldDistributorAddress, yieldDistributorAbi, this.wallet);
      }
      if (marketplaceAddress) {
        const marketplaceAbi = Array.isArray(MarketplaceABI) ? MarketplaceABI : (MarketplaceABI as any).abi || MarketplaceABI;
        this.marketplace = new ethers.Contract(marketplaceAddress, marketplaceAbi, this.wallet);
      }
      if (questSystemAddress) {
        const questSystemAbi = Array.isArray(QuestSystemABI) ? QuestSystemABI : (QuestSystemABI as any).abi || QuestSystemABI;
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

  async getOwnerProperties(ownerAddress: string) {
    return this.propertyNFT.getOwnerProperties(ownerAddress);
  }

  async getOwnerPropertyCount(ownerAddress: string) {
    return this.propertyNFT.getOwnerPropertyCount(ownerAddress);
  }

  async calculateYield(propertyId: bigint) {
    return this.yieldDistributor.calculateYield(propertyId);
  }

  async getTotalPendingYield(ownerAddress: string) {
    return this.yieldDistributor.getTotalPendingYield(ownerAddress);
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

