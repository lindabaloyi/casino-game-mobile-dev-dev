/**
 * useSocketConnection
 * 
 * Handles Socket.IO connection lifecycle with auto-detection of server URL.
 * Uses the SocketManager singleton to ensure only ONE socket exists across
 * the entire app - navigating between screens won't disconnect/reconnect.
 * 
 * Responsibilities:
 *  - Get shared socket from SocketManager
 *  - Authenticate the socket on first connect
 *  - Auto-join matchmaking queue based on mode (except private mode)
 *  - Expose socket state to components
 * 
 * Usage:
 *   const { socket, isConnected } = useSocketConnection({ mode: 'two-hands' });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, getCurrentSocket, isSocketConnected, disconnectSocket, onSocketStateChange } from './socketManager';

export type GameMode = 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'tournament' | 'private';

export interface UseSocketConnectionOptions {
  mode: GameMode;
  /** Room code for private room mode - when provided, won't auto-join queues */
  roomCode?: string | null;
}

export interface UseSocketConnectionResult {
  /** The socket instance (null until connected) */
  socket: Socket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Error message if connection failed */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

export function useSocketConnection(
  options: UseSocketConnectionOptions
): UseSocketConnectionResult {
  const { mode, roomCode } = options;
  const isPartyMode = mode === 'party';
  const isTwoHandsMode = mode === 'two-hands';
  const isPrivateMode = mode === 'private';
  const isPrivateRoomGame = !!roomCode; // Private room with actual game mode
  
  const [socket, setSocket] = useState<Socket | null>(getCurrentSocket());
  const [isConnected, setIsConnected] = useState(isSocketConnected());
  const [error, setError] = useState<string | null>(null);
  
  // Track whether we've already joined queues on this socket
  const hasSetupRef = useRef(false);

  // Setup the socket: join queues (only once per socket lifecycle)
  const setupSocket = useCallback((sock: Socket) => {
    if (!sock?.connected) return;
    
    // Skip auto-queue when roomCode is provided (private room handles its own flow)
    // This must come FIRST before any queue join logic
    if (roomCode) {
      console.log('[Client] Private room mode detected, skipping queue join');
      sock.emit('room-mode-connected', { mode, roomCode });
      return;
    }

    // Skip auto-queue for private mode (room-based games handle their own flow)
    if (isPrivateMode) {
      // Emit room mode so server knows this socket is for private room gameplay
      sock.emit('room-mode-connected', { mode, roomCode });
      return;
    }

    // Only join queues once per socket connection
    if (hasSetupRef.current) return;
    hasSetupRef.current = true;

    // Join the appropriate queue immediately on connect
    // Two-hands mode: join the two-hands queue when connected
    if (isTwoHandsMode) {
      sock.emit('join-two-hands-queue');
    }

    // Party mode: join the party queue when connected
    if (isPartyMode) {
      sock.emit('join-party-queue');
    }

    // Three-hands mode: join the three-hands queue when connected
    if (mode === 'three-hands') {
      console.log('[Client] emit join-three-hands-queue');
      sock.emit('join-three-hands-queue');
    }

    // Four-hands mode: join the four-hands queue when connected
    if (mode === 'four-hands') {
      sock.emit('join-four-hands-queue');
    }

    // Tournament mode: join the tournament queue when connected
    if (mode === 'tournament') {
      sock.emit('join-tournament-queue');
    }
  }, [mode, isPartyMode, isTwoHandsMode, isPrivateMode, isPrivateRoomGame, roomCode]);

  // Watch for roomCode becoming available after initial mount
  // This handles the case where useLocalSearchParams isn't available on first render
  useEffect(() => {
    if (!roomCode) return;
    
    const sock = getCurrentSocket();
    if (sock?.connected) {
      console.log('[Client] roomCode now available, emitting room-mode-connected');
      sock.emit('room-mode-connected', { mode, roomCode });
    }
  }, [roomCode, mode]);

  // Connect the shared socket on mount
  useEffect(() => {
    getSocket()
      .then(sock => {
        setSocket(sock);
        setIsConnected(true);
        setError(null);
        setupSocket(sock);
      })
      .catch(err => {
        console.error('[useSocketConnection] Failed to connect:', err);
        setError('Failed to connect to server. Please check network configuration.');
      });
    
    // Subscribe to connection state changes from the SocketManager
    const unsubscribe = onSocketStateChange((connected, sock) => {
      setSocket(sock);
      setIsConnected(connected);
      if (connected && sock) {
        setupSocket(sock);
      }
    });
    
    return () => {
      // DO NOT disconnect the shared socket on unmount.
      // Other screens may still need it.
      unsubscribe();
    };
  }, [setupSocket]);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
    setIsConnected(false);
    hasSetupRef.current = false;
  }, []);

  const reconnect = useCallback(() => {
    disconnectSocket();
    hasSetupRef.current = false;
    setSocket(null);
    setIsConnected(false);
    
    getSocket()
      .then(sock => {
        setSocket(sock);
        setIsConnected(true);
        setError(null);
        setupSocket(sock);
      })
      .catch(err => {
        console.error('[useSocketConnection] Reconnect failed:', err);
        setError('Failed to reconnect to server.');
      });
  }, [setupSocket]);

  return {
    socket,
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}

export default useSocketConnection;
