import { Injectable, Logger, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { eq, desc } from 'drizzle-orm';
import { WebsocketGateway } from '../websocket/websocket.gateway';

export interface ChatMessageDto {
  id: string;
  userId: string;
  walletAddress: string;
  username?: string;
  message: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private db: PostgresJsDatabase<typeof schema>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async sendMessage(walletAddress: string, message: string): Promise<ChatMessageDto> {
    // Get or create user
    let [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    if (!user) {
      [user] = await this.db
        .insert(schema.users)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    // Create chat message
    const [chatMessage] = await this.db
      .insert(schema.chatMessages)
      .values({
        userId: user.id,
        message: message.trim(),
        createdAt: new Date(),
      })
      .returning();

    const messageDto = {
      id: chatMessage.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      username: user.username || undefined,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt,
    };

    // Broadcast via WebSocket
    this.websocketGateway.emitChatMessage(messageDto);

    return messageDto;
  }

  async getRecentMessages(limit: number = 50): Promise<ChatMessageDto[]> {
    const messages = await this.db
      .select({
        id: schema.chatMessages.id,
        userId: schema.chatMessages.userId,
        message: schema.chatMessages.message,
        createdAt: schema.chatMessages.createdAt,
        walletAddress: schema.users.walletAddress,
        username: schema.users.username,
      })
      .from(schema.chatMessages)
      .leftJoin(schema.users, eq(schema.chatMessages.userId, schema.users.id))
      .orderBy(desc(schema.chatMessages.createdAt))
      .limit(limit);

    return messages.map((msg) => ({
      id: msg.id,
      userId: msg.userId,
      walletAddress: msg.walletAddress || '',
      username: msg.username || undefined,
      message: msg.message,
      createdAt: msg.createdAt,
    }));
  }
}

