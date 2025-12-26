import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface BattleEvent {
  type: 'TROOP_SPAWN' | 'TROOP_MOVE' | 'TROOP_ATTACK' | 'TROOP_DEATH' | 'BUILDING_ATTACK' | 'BUILDING_DESTROYED' | 'BATTLE_END';
  timestamp: number;
  data: any;
}

// ============================================
// SPECTATE SOCKET (Public, no auth required)
// Used for all real-time battle event streaming
// ============================================

let spectateSocket: Socket | null = null;

/**
 * Connect to spectate WebSocket (public, no authentication required)
 */
export function connectSpectateSocket(): Socket {
  if (spectateSocket?.connected) {
    return spectateSocket;
  }

  spectateSocket = io(`${BACKEND_URL}/spectate`, {
    transports: ['websocket', 'polling'],
    // No auth required for spectators
  });

  spectateSocket.on('connect', () => {
    console.log('[Spectate] Connected to spectate WebSocket:', spectateSocket?.id);
  });

  spectateSocket.on('disconnect', () => {
    console.log('[Spectate] Disconnected from spectate WebSocket');
  });

  spectateSocket.on('connect_error', (error) => {
    console.error('[Spectate] Connection error:', error);
  });

  return spectateSocket;
}

/**
 * Disconnect from spectate WebSocket
 */
export function disconnectSpectateSocket() {
  if (spectateSocket) {
    spectateSocket.disconnect();
    spectateSocket = null;
  }
}

/**
 * Join a battle as a spectator (no auth required)
 */
export function joinBattleAsSpectator(battleId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!spectateSocket) {
      reject(new Error('Spectate socket not connected'));
      return;
    }

    spectateSocket.emit('joinBattle', { battleId }, (response: any) => {
      if (response.success) {
        console.log('[Spectate] Joined battle as spectator:', battleId);
        resolve(response);
      } else {
        console.error('[Spectate] Failed to join battle:', response);
        reject(new Error(response.message || 'Failed to join battle'));
      }
    });
  });
}

/**
 * Leave a battle room
 */
export function leaveSpectatorBattle(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!spectateSocket) {
      reject(new Error('Spectate socket not connected'));
      return;
    }

    spectateSocket.emit('leaveBattle', {}, (response: any) => {
      if (response.success) {
        console.log('[Spectate] Left battle room');
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to leave battle'));
      }
    });
  });
}

/**
 * Listen to battle events on spectate socket
 */
export function onSpectateEvent(callback: (event: BattleEvent) => void) {
  if (!spectateSocket) return;
  spectateSocket.on('battleEvent', callback);
}

/**
 * Listen to batched battle events on spectate socket
 */
export function onSpectateEventBatch(callback: (batch: { battleId: string; events: BattleEvent[]; timestamp: number }) => void) {
  if (!spectateSocket) return;
  spectateSocket.on('battleEventBatch', callback);
}

/**
 * Listen to battle end event on spectate socket
 */
export function onSpectateEnd(callback: (result: any) => void) {
  if (!spectateSocket) return;
  spectateSocket.on('battleEnd', callback);
}

/**
 * Remove spectate event listeners
 */
export function offSpectateEvent(callback: (event: BattleEvent) => void) {
  if (!spectateSocket) return;
  spectateSocket.off('battleEvent', callback);
}

export function offSpectateEventBatch(callback: (batch: any) => void) {
  if (!spectateSocket) return;
  spectateSocket.off('battleEventBatch', callback);
}

export function offSpectateEnd(callback: (result: any) => void) {
  if (!spectateSocket) return;
  spectateSocket.off('battleEnd', callback);
}

export { spectateSocket };
