/**
 * SocketManager
 * 
 * Singleton that manages a single Socket.IO connection across the app.
 * Prevents multiple socket connections when navigating between screens.
 * 
 * Usage:
 *   import { getSocket, disconnectSocket } from './socketManager';
 *   const socket = getSocket();
 */

import { io, Socket } from 'socket.io-client';
import { getOptimalServerUrl } from '../../utils/serverUrl';

let socketInstance: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;
let isConnected = false;
let listeners: Set<(connected: boolean, socket: Socket | null) => void> = new Set();
let heartbeatInterval: NodeJS.Timeout | null = null;

const HEARTBEAT_INTERVAL_MS = 5000;

function startHeartbeat(socket: Socket) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat');
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function notifyListeners() {
  listeners.forEach(cb => cb(isConnected, socketInstance));
}

/**
 * Get or create the socket connection.
 * Returns the existing socket if already connected, otherwise creates a new one.
 */
export async function getSocket(): Promise<Socket> {
  // Return existing connected socket
  if (socketInstance?.connected) {
    return socketInstance;
  }

  // Return existing connection promise if in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = (async () => {
    try {
      const socketUrl = await getOptimalServerUrl();

      socketInstance = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 15000,
        forceNew: false,
      });

      return new Promise<Socket>((resolve, reject) => {
socketInstance!.on('connect', () => {
          isConnected = true;
          connectionPromise = null;
          notifyListeners();
          startHeartbeat(socketInstance!);
          resolve(socketInstance!);
        });

        socketInstance!.on('disconnect', () => {
          isConnected = false;
          stopHeartbeat();
          notifyListeners();
        });

        socketInstance!.on('connect_error', (err) => {
          console.error('[SocketManager] Connection error:', err.message);
          isConnected = false;
          connectionPromise = null;
          notifyListeners();
          reject(err);
        });

        socketInstance!.on('disconnect', () => {
          isConnected = false;
          notifyListeners();
        });
      });
    } catch (err) {
      console.error('[SocketManager] Failed to connect:', err);
      connectionPromise = null;
      throw err;
    }
  })();

  return connectionPromise;
}

/**
 * Get the current socket instance (may be null if not connected).
 */
export function getCurrentSocket(): Socket | null {
  return socketInstance;
}

/**
 * Check if the socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return isConnected;
}

/**
 * Subscribe to socket connection state changes.
 * Returns an unsubscribe function.
 */
export function onSocketStateChange(
  cb: (connected: boolean, socket: Socket | null) => void
): () => void {
  listeners.add(cb);
  // Immediately notify with current state
  cb(isConnected, socketInstance);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Disconnect the socket (only call when app is closing).
 */
export function disconnectSocket(): void {
  stopHeartbeat();
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    isConnected = false;
    connectionPromise = null;
    notifyListeners();
  }
}
