import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as PropertyNFTABI from './abis/PropertyNFT.json';
import * as GameTokenABI from './abis/GameToken.json';
import * as YieldDistributorABI from './abis/YieldDistributor.json';
import * as MarketplaceABI from './abis/Marketplace.json';
import * as QuestSystemABI from './abis/QuestSystem.json';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  
  public propertyNFT: ethers.Contract;
  public gameToken: ethers.Contract;
  public yieldDistributor: ethers.Contract;
  public marketplace: ethers.Contract;
  public questSystem: ethers.Contract;

  constructor(private configService: ConfigService) {
    // Delay initialization slightly to ensure ConfigModule has loaded env vars
    setTimeout(() => {
      this.initializeContracts();
    }, 100);
  }

  private initializeContracts() {
    try {
      const rpcUrl = this.configService.get<string>('MANTLE_RPC_URL');
      const privateKey = this.configService.get<string>('PRIVATE_KEY');

      this.logger.log(`Initializing contracts - RPC URL: ${rpcUrl ? 'SET' : 'MISSING'}, Private Key: ${privateKey ? 'SET' : 'MISSING'}`);

      if (!rpcUrl || !privateKey) {
        this.logger.error('Missing MANTLE_RPC_URL or PRIVATE_KEY for contract service.');
        this.logger.error(`MANTLE_RPC_URL: ${rpcUrl || 'NOT SET'}`);
        this.logger.error(`PRIVATE_KEY: ${privateKey ? 'SET (hidden)' : 'NOT SET'}`);
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
        this.propertyNFT = new ethers.Contract(propertyNFTAddress, PropertyNFTABI as any, this.wallet);
        this.logger.log(`PropertyNFT contract initialized at ${propertyNFTAddress}`);
      } else {
        this.logger.error('PROPERTY_NFT_ADDRESS not set in environment variables');
      }
      
      if (gameTokenAddress) {
        this.gameToken = new ethers.Contract(gameTokenAddress, GameTokenABI as any, this.wallet);
      }
      if (yieldDistributorAddress) {
        this.yieldDistributor = new ethers.Contract(yieldDistributorAddress, YieldDistributorABI as any, this.wallet);
      }
      if (marketplaceAddress) {
        this.marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI as any, this.wallet);
      }
      if (questSystemAddress) {
        this.questSystem = new ethers.Contract(questSystemAddress, QuestSystemABI as any, this.wallet);
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

