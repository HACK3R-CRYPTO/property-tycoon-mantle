import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

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
    client.join(`portfolio:${data.address}`);
    this.logger.log(`Client ${client.id} subscribed to portfolio: ${data.address}`);
  }

  emitPropertyCreated(data: { propertyId: string; owner: string; propertyType: string }) {
    this.server.emit('property:created', data);
  }

  emitYieldClaimed(data: { propertyId: string; owner: string; amount: string }) {
    this.server.emit('yield:claimed', data);
    this.server.to(`portfolio:${data.owner}`).emit('portfolio:updated', data);
  }

  emitMarketplaceTrade(data: { listingId: number; seller: string; buyer: string; price: string }) {
    this.server.emit('marketplace:trade', data);
  }

  emitLeaderboardUpdate(data: { rankings: any[] }) {
    this.server.to('leaderboard').emit('leaderboard:updated', data);
  }
}
