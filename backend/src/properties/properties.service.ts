import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { ContractsService } from '../contracts/contracts.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private contractsService: ContractsService,
  ) {}

  async findAll() {
    return this.db
      .select({
        id: schema.properties.id,
        tokenId: schema.properties.tokenId,
        ownerId: schema.properties.ownerId,
        propertyType: schema.properties.propertyType,
        value: schema.properties.value,
        yieldRate: schema.properties.yieldRate,
        rwaContract: schema.properties.rwaContract,
        rwaTokenId: schema.properties.rwaTokenId,
        totalYieldEarned: schema.properties.totalYieldEarned,
        x: schema.properties.x,
        y: schema.properties.y,
        isActive: schema.properties.isActive,
        createdAt: schema.properties.createdAt,
        updatedAt: schema.properties.updatedAt,
        owner: {
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
          username: schema.users.username,
        },
      })
      .from(schema.properties)
      .leftJoin(schema.users, eq(schema.properties.ownerId, schema.users.id));
  }

  async findById(id: string) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);
    return property;
  }

  async findByOwner(ownerId: string) {
    return this.db
      .select({
        id: schema.properties.id,
        tokenId: schema.properties.tokenId,
        ownerId: schema.properties.ownerId,
        propertyType: schema.properties.propertyType,
        value: schema.properties.value,
        yieldRate: schema.properties.yieldRate,
        rwaContract: schema.properties.rwaContract,
        rwaTokenId: schema.properties.rwaTokenId,
        totalYieldEarned: schema.properties.totalYieldEarned,
        x: schema.properties.x,
        y: schema.properties.y,
        isActive: schema.properties.isActive,
        createdAt: schema.properties.createdAt,
        updatedAt: schema.properties.updatedAt,
      })
      .from(schema.properties)
      .where(eq(schema.properties.ownerId, ownerId));
  }

  async findByWalletAddress(walletAddress: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      return [];
    }

    return this.findByOwner(user.id);
  }

  async create(propertyData: {
    tokenId: number;
    ownerId: string;
    propertyType: string;
    value: bigint;
    yieldRate: number;
    rwaContract?: string;
    rwaTokenId?: number;
  }) {
    const [property] = await this.db
      .insert(schema.properties)
      .values({
        ...propertyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return property;
  }

  async syncFromChain(walletAddress: string) {
    try {
      const properties = await this.contractsService.getOwnerProperties(walletAddress);
      
      const [user] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, walletAddress))
        .limit(1);

      if (!user) {
        return [];
      }

      for (const tokenId of properties) {
        const propertyData = await this.contractsService.getProperty(tokenId);
        
        const existing = await this.db
          .select()
          .from(schema.properties)
          .where(eq(schema.properties.tokenId, Number(tokenId)))
          .limit(1);

        if (existing.length === 0) {
          await this.create({
            tokenId: Number(tokenId),
            ownerId: user.id,
            propertyType: this.mapPropertyType(propertyData.propertyType),
            value: BigInt(propertyData.value.toString()),
            yieldRate: Number(propertyData.yieldRate),
            rwaContract: propertyData.rwaContract !== '0x0000000000000000000000000000000000000000' 
              ? propertyData.rwaContract 
              : undefined,
            rwaTokenId: propertyData.rwaTokenId ? Number(propertyData.rwaTokenId) : undefined,
          });
        }
      }

      return this.findByOwner(user.id);
    } catch (error) {
      this.logger.error(`Error syncing properties from chain: ${error.message}`);
      throw error;
    }
  }

  async updateCoordinates(tokenId: number, x: number, y: number) {
    const [updated] = await this.db
      .update(schema.properties)
      .set({
        x,
        y,
        updatedAt: new Date(),
      })
      .where(eq(schema.properties.tokenId, tokenId))
      .returning();
    return updated;
  }

  private mapPropertyType(type: number): string {
    const types = ['Residential', 'Commercial', 'Industrial', 'Luxury'];
    return types[type] || 'Residential';
  }
}
