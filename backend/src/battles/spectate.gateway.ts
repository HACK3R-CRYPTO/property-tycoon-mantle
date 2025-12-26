import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { BattleSessionManager } from './battle-session.manager';
import { SomniaService } from '../somnia/somnia.service';

export interface BattleEvent {
  type:
    | 'TROOP_SPAWN'
    | 'TROOP_MOVE'
    | 'TROOP_ATTACK'
    | 'TROOP_DEATH'
    | 'BUILDING_ATTACK'
    | 'BUILDING_DESTROYED'
    | 'BATTLE_END';
  timestamp: number;
  data: any;
}

/**
 * Public spectator WebSocket gateway
 * No authentication required - anyone can watch battles
 * Read-only: spectators cannot deploy troops or interact with battles
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/spectate',
})
export class SpectateGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track which spectators are in which battles
  private spectatorBattles = new Map<string, string>(); // socketId -> battleId
  private battleSpectators = new Map<string, Set<string>>(); // battleId -> Set<socketId>

  // Event batching infrastructure
  private readonly BATCH_SIZE = 1; // Send batch when 1 event accumulates
  private eventBatches = new Map<string, BattleEvent[]>(); // battleId -> event buffer

  constructor(
    @Inject(forwardRef(() => BattleSessionManager))
    private battleSessionManager: BattleSessionManager,
    private somniaService: SomniaService,
  ) {
    // Don't set gateway here - server isn't initialized yet!
  }

  /**
   * Called after WebSocket server is initialized
   * This is when this.server is available
   */
  afterInit() {
    console.log('[Spectate] WebSocket server initialized on /spectate namespace');
    // NOW set the gateway reference - server is ready
    this.battleSessionManager.setSpectateGateway(this);
    // Set SomniaService for battle result publishing
    this.battleSessionManager.setSomniaService(this.somniaService);
  }

  handleConnection(client: Socket) {
    console.log(`[Spectate] Client connected: ${client.id}`);

    // Ensure gateway is registered with session manager (failsafe if afterInit wasn't called)
    if (this.battleSessionManager) {
      this.battleSessionManager.setSpectateGateway(this);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Spectate] Client disconnected: ${client.id}`);

    // Clean up spectator from battle rooms
    const battleId = this.spectatorBattles.get(client.id);
    if (battleId) {
      const spectators = this.battleSpectators.get(battleId);
      if (spectators) {
        spectators.delete(client.id);
        if (spectators.size === 0) {
          this.battleSpectators.delete(battleId);
        }
      }
      this.spectatorBattles.delete(client.id);
    }
  }

  /**
   * Join a battle as a spectator (public, no auth required)
   */
  @SubscribeMessage('joinBattle')
  async handleJoinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { battleId: string },
  ) {
    const { battleId } = payload;

    console.log(`[Spectate] Client ${client.id} joining battle ${battleId} as spectator`);

    // Get battle session to send initial state
    const session = this.battleSessionManager.getSession(battleId);
    console.log(
      `[Spectate] Session found: ${!!session}, Troops count: ${session?.troops?.length || 0}, Buildings count: ${session?.buildings?.length || 0}`,
    );
    if (session && session.troops.length > 0) {
      console.log(`[Spectate] First troop:`, {
        id: session.troops[0].id,
        type: session.troops[0].type,
        position: session.troops[0].position,
        health: session.troops[0].health,
        isAlive: session.troops[0].isAlive,
      });
    }

    // Join the socket.io room
    client.join(battleId);

    // Track the connection
    this.spectatorBattles.set(client.id, battleId);
    if (!this.battleSpectators.has(battleId)) {
      this.battleSpectators.set(battleId, new Set());
    }
    this.battleSpectators.get(battleId)!.add(client.id);

    console.log(
      `[Spectate] Client ${client.id} joined battle ${battleId}. Total spectators: ${this.battleSpectators.get(battleId)!.size}`,
    );

    // Return battle session data for spectators to render
    const response = {
      success: true,
      message: 'Joined battle as spectator',
      isSpectator: true,
      session: session
        ? {
            id: session.id,
            status: session.status,
            buildings: session.buildings.map((b) => ({
              id: b.id,
              type: b.type,
              position: b.position,
              health: b.health,
              maxHealth: b.maxHealth,
              isDestroyed: b.isDestroyed,
            })),
            troops: session.troops.map((t) => ({
              id: t.id,
              type: t.type,
              position: t.position,
              health: t.health,
              maxHealth: t.maxHealth,
            })),
            destructionPercentage: session.destructionPercentage,
          }
        : null,
    };

    console.log(
      `[Spectate] Sending response with ${response.session?.troops?.length || 0} troops and ${response.session?.buildings?.length || 0} buildings`,
    );

    return response;
  }

  /**
   * Leave a battle room
   */
  @SubscribeMessage('leaveBattle')
  async handleLeaveBattle(@ConnectedSocket() client: Socket) {
    const battleId = this.spectatorBattles.get(client.id);

    if (battleId) {
      client.leave(battleId);

      const spectators = this.battleSpectators.get(battleId);
      if (spectators) {
        spectators.delete(client.id);
      }
      this.spectatorBattles.delete(client.id);

      console.log(`[Spectate] Client ${client.id} left battle ${battleId}`);
    }

    return { success: true };
  }

  /**
   * Broadcast a battle event to all spectators
   * Events are batched and sent when BATCH_SIZE is reached
   */
  broadcastEvent(battleId: string, event: BattleEvent) {
    if (!this.server) {
      console.warn(`[Spectate] Cannot broadcast ${event.type} - server not initialized`);
      return;
    }

    // Initialize batch buffer for this battle if it doesn't exist
    if (!this.eventBatches.has(battleId)) {
      this.eventBatches.set(battleId, []);
    }

    // Add event to batch
    const batch = this.eventBatches.get(battleId)!;
    batch.push(event);

    // Check if the event is BATTLE_END - if so, flush immediately
    if (event.type === 'BATTLE_END') {
      console.log(`Battle ${battleId} ended - flushing all remaining events immediately`);
      this.flushEventBatch(battleId);
      return;
    }

    // Send batch when it reaches BATCH_SIZE
    if (batch.length >= this.BATCH_SIZE) {
      this.flushEventBatch(battleId);
    }
  }

  /**
   * Flush accumulated events for spectators
   */
  flushEventBatch(battleId: string) {
    const batch = this.eventBatches.get(battleId);

    if (!batch || batch.length === 0) {
      return;
    }

    const spectatorCount = this.battleSpectators.get(battleId)?.size || 0;
    console.log(
      `[Spectate] Flushing ${batch.length} events to battle ${battleId} (${spectatorCount} spectators)`,
    );

    // Emit batched events
    this.server.to(battleId).emit('battleEventBatch', {
      battleId,
      events: [...batch],
      timestamp: Date.now(),
    });

    // Clear the batch
    this.eventBatches.set(battleId, []);
  }

  /**
   * Broadcast battle end event to spectators
   * Flushes any remaining batched events first
   */
  broadcastBattleEnd(battleId: string, result: any) {
    if (!this.server) {
      console.warn(`[Spectate] Cannot broadcast battle end - server not initialized`);
      return;
    }

    // Flush any remaining events before sending battle end
    this.flushEventBatch(battleId);

    console.log(`[Spectate] Broadcasting battle end to ${battleId}`);
    this.server.to(battleId).emit('battleEnd', result);

    // Clean up batch buffer
    this.eventBatches.delete(battleId);
  }

  /**
   * Get number of spectators in a battle
   */
  getSpectatorCount(battleId: string): number {
    return this.battleSpectators.get(battleId)?.size || 0;
  }

  /**
   * Get all spectators in a battle
   */
  getBattleSpectators(battleId: string): string[] {
    const spectators = this.battleSpectators.get(battleId);
    return spectators ? Array.from(spectators) : [];
  }
}
