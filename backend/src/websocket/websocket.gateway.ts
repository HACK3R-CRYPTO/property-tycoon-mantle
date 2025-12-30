import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor() {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:leaderboard')
  handleLeaderboardSubscribe(client: Socket) {
    client.join('leaderboard');
    this.logger.log(`Client ${client.id} subscribed to leaderboard`);
  }

  @SubscribeMessage('subscribe:portfolio')
  handlePortfolioSubscribe(client: Socket, data: { address: string }) {
    const room = `portfolio:${data.address.toLowerCase()}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to portfolio: ${room}`);
  }

  @SubscribeMessage('subscribe:chat')
  handleChatSubscribe(client: Socket) {
    client.join('chat');
    this.logger.log(`Client ${client.id} subscribed to chat`);
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { walletAddress: string; message: string },
  ) {
    // Chat messages are handled via HTTP API, then broadcast here
    // This handler can be used for validation or additional processing
    this.logger.log(`Chat message received from ${data.walletAddress}`);
    return { success: true };
  }

  emitPropertyCreated(data: { propertyId: string; owner: string; propertyType: string }) {
    this.server.emit('property:created', data);
  }

  emitYieldClaimed(data: { propertyId: string; owner: string; amount: string }) {
    this.server.emit('yield:claimed', data);
    this.server.to(`portfolio:${data.owner}`).emit('portfolio:updated', data);
  }

  emitMarketplaceListing(data: { propertyId: number; seller: string; price: string }) {
    this.server.emit('marketplace:listing', data);
    this.logger.log(`Emitted marketplace:listing for property ${data.propertyId}`);
  }

  emitMarketplaceTrade(data: { listingId: number; seller: string; buyer: string; price: string }) {
    this.server.emit('marketplace:trade', data);
  }

  emitMarketplaceCancelled(data: { propertyId: number; seller: string }) {
    this.server.emit('marketplace:cancelled', data);
    this.logger.log(`Emitted marketplace:cancelled for property ${data.propertyId}`);
  }

  emitLeaderboardUpdate(data: { rankings: any[] }) {
    this.server.to('leaderboard').emit('leaderboard:updated', data);
  }

  emitChatMessage(data: { id: string; walletAddress: string; username?: string; message: string; createdAt: Date }) {
    this.server.to('chat').emit('chat:new', data);
  }

  emitYieldTimeUpdate(data: {
    walletAddress: string;
    yieldUpdateIntervalSeconds: number;
    currentBlockTimestamp: number;
    shortestTimeRemaining: { hours: number; minutes: number } | null;
    totalClaimableYield: string;
    properties: Array<{
      tokenId: number;
      lastYieldUpdate: number;
      createdAt: number;
      timeElapsedSeconds: number;
      timeElapsedHours: number;
      hoursRemaining: number;
      minutesRemaining: number;
      isClaimable: boolean;
      claimableYield: string;
    }>;
  }) {
    // Ensure all values are JSON-serializable (no BigInt)
    const serializableData = {
      ...data,
      totalClaimableYield: String(data.totalClaimableYield),
      properties: data.properties.map(p => ({
        ...p,
        claimableYield: String(p.claimableYield),
      })),
    };
    const room = `portfolio:${data.walletAddress.toLowerCase()}`;
    const clientsInRoom = this.server.sockets.adapter.rooms.get(room);
    const clientCount = clientsInRoom ? clientsInRoom.size : 0;
    this.logger.log(`Emitting yield:time-update to ${room} (${data.properties.length} properties, ${clientCount} clients)`);
    this.server.to(room).emit('yield:time-update', serializableData);
  }

  emitPriceUpdate(data: {
    mntPriceUSD: number;
    tycoonPriceUSD: number;
    timestamp: number;
  }) {
    // Broadcast to all connected clients
    this.server.emit('price:update', data);
    this.logger.debug(`Emitted price update: MNT/USD = $${data.mntPriceUSD.toFixed(4)}, TYCOON/USD = $${data.tycoonPriceUSD.toFixed(6)}`);
  }
}
