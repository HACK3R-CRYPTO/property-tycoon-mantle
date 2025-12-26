import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SDK as SomniaStreamSDK, SchemaEncoder } from '@somnia-chain/streams';
import { createWalletClient, http, toHex, Hex, createPublicClient, keccak256 } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { waitForTransactionReceipt } from 'viem/actions';
import { somniaTestnet } from './helper';
import {
  BATTLE_RESULT_SCHEMA,
  BATTLE_RESULT_SCHEMA_NAME,
  BattleResultData,
} from './schemas/battle-results.schema';

@Injectable()
export class SomniaService implements OnModuleInit {
  private readonly logger = new Logger(SomniaService.name);
  private sdk: SomniaStreamSDK;
  private chatEncoder: SchemaEncoder;
  private battleResultEncoder: SchemaEncoder;
  private account: PrivateKeyAccount;

  // Chat schema
  private readonly chatSchema = 'uint64 timestamp, string sender, string content, string avatar';
  private chatSchemaId: `0x${string}`;

  // Battle results schema
  private readonly battleResultSchema = BATTLE_RESULT_SCHEMA;
  private battleResultSchemaId: `0x${string}`;

  constructor(private configService: ConfigService) {
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    if (!privateKey) {
      this.logger.error('PRIVATE_KEY is not defined in environment variables');
      throw new Error('PRIVATE_KEY is required');
    }

    // Initialize Viem Wallet Client
    this.account = privateKeyToAccount(privateKey as Hex);

    // Initialize Somnia SDK
    this.sdk = new SomniaStreamSDK({
      public: this.getPublicClient() as any,
      wallet: this.getWalletClient(),
    });
    this.chatEncoder = new SchemaEncoder(this.chatSchema);
    this.battleResultEncoder = new SchemaEncoder(this.battleResultSchema);
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Somnia Service...');

      // Register Chat Schema
      this.chatSchemaId = (await this.sdk.computeSchemaId(this.chatSchema)) as `0x${string}`;
      this.logger.log(`Chat Schema ID: ${this.chatSchemaId}`);

      const isChatRegistered = await this.sdk.streams.isDataSchemaRegistered(this.chatSchemaId);
      if (!isChatRegistered) {
        const txHash = await this.sdk.registerDataSchemas([
          {
            schemaName: 'GlobalChat',
            schema: this.chatSchema,
          },
        ]);
        if (txHash instanceof Error) throw txHash;
        await waitForTransactionReceipt(this.getPublicClient() as any, { hash: txHash });
        this.logger.log(`Chat schema registration tx: ${txHash}`);
      } else {
        this.logger.log('Chat schema already registered');
      }

      // Register Battle Results Schema
      this.battleResultSchemaId = (await this.sdk.computeSchemaId(
        this.battleResultSchema,
      )) as `0x${string}`;
      this.logger.log(`Battle Result Schema ID: ${this.battleResultSchemaId}`);

      const isBattleRegistered = await this.sdk.streams.isDataSchemaRegistered(
        this.battleResultSchemaId,
      );
      if (!isBattleRegistered) {
        const txHash = await this.sdk.registerDataSchemas([
          {
            schemaName: BATTLE_RESULT_SCHEMA_NAME,
            schema: this.battleResultSchema,
          },
        ]);
        if (txHash instanceof Error) throw txHash;
        await waitForTransactionReceipt(this.getPublicClient() as any, { hash: txHash });
        this.logger.log(`Battle result schema registration tx: ${txHash}`);
      } else {
        this.logger.log('Battle result schema already registered');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Somnia Service', error);
    }
  }

  getWalletClient() {
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'https://dream-rpc.somnia.network';
    return createWalletClient({
      account: this.account,
      chain: somniaTestnet,
      transport: http(rpcUrl),
    });
  }

  getPublicClient() {
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'https://dream-rpc.somnia.network';
    return createPublicClient({
      chain: somniaTestnet,
      transport: http(rpcUrl),
    });
  }

  async publishChatMessage(sender: string, content: string, avatar: string = '') {
    try {
      const timestamp = Date.now();

      // Encode data
      const data = this.chatEncoder.encodeData([
        { name: 'timestamp', value: BigInt(timestamp), type: 'uint64' },
        { name: 'sender', value: sender, type: 'string' },
        { name: 'content', value: content, type: 'string' },
        { name: 'avatar', value: avatar, type: 'string' },
      ]);

      // Generate a unique Data ID
      // Using timestamp + random nonce to ensure uniqueness
      const nonce = Math.floor(Math.random() * 1000000);
      const dataId = toHex(`${timestamp}-${nonce}`, { size: 32 });

      this.logger.log(`Publishing message from ${sender}...`);

      // Write to Somnia Datastreams
      const txHash = await this.sdk.streams.set([
        {
          id: dataId,
          schemaId: this.chatSchemaId,
          data: data as Hex,
        },
      ]);

      this.logger.log(`Message published! Tx: ${txHash}`);
      return { success: true, txHash, timestamp };
    } catch (error) {
      this.logger.error('Failed to publish chat message', error);
      throw error;
    }
  }

  async publishBattleResult(battle: BattleResultData) {
    try {
      const timestamp = Date.now();

      // Encode battle result data
      const data = this.battleResultEncoder.encodeData([
        { name: 'timestamp', value: BigInt(timestamp), type: 'uint64' },
        { name: 'battleId', value: battle.battleId, type: 'string' },
        { name: 'attackerId', value: battle.attackerId, type: 'string' },
        { name: 'defenderId', value: battle.defenderId, type: 'string' },
        { name: 'stars', value: battle.stars, type: 'uint8' },
        { name: 'destructionPercentage', value: battle.destructionPercentage, type: 'uint8' },
        { name: 'lootGold', value: battle.lootGold, type: 'uint32' },
        { name: 'lootElixir', value: battle.lootElixir, type: 'uint32' },
        { name: 'status', value: battle.status, type: 'string' },
      ]);

      // Generate deterministic Data ID by hashing battleId (ensures 32 bytes)
      const dataId = keccak256(toHex(battle.battleId));

      this.logger.log(`Publishing battle result for ${battle.battleId}...`);

      // Write to Somnia Datastreams
      const txHash = await this.sdk.streams.set([
        {
          id: dataId,
          schemaId: this.battleResultSchemaId,
          data: data as Hex,
        },
      ]);

      this.logger.log(`Battle result published! Battle: ${battle.battleId}, Tx: ${txHash}`);
      return { success: true, txHash, timestamp };
    } catch (error) {
      this.logger.error(`Failed to publish battle result for ${battle.battleId}`, error);
      // Don't throw - we don't want to break battle flow if Somnia publish fails
      return { success: false, error: error.message };
    }
  }

  getChatSchemaId() {
    return this.chatSchemaId;
  }

  getBattleResultSchemaId() {
    return this.battleResultSchemaId;
  }

  getPublisherAddress() {
    return this.account.address;
  }
}
