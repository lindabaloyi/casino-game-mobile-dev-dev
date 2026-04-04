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
import { useAuth } from '../useAuth';

export type GameMode = 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'freeforall' | 'tournament' | 'private';

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
  
  // Get user authentication info
  const { user } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(getCurrentSocket());
  const [isConnected, setIsConnected] = useState(isSocketConnected());
  const [error, setError] = useState<string | null>(null);
  
  // Track whether we've already authenticated and joined queues on this socket
  const hasSetupRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Setup the socket: authenticate, join queues (only once per socket lifecycle)
  const setupSocket = useCallback((sock: Socket) => {
    if (!sock?.connected) return;
    
    // Authenticate after connecting if user is logged in
    if (user?._id && lastUserIdRef.current !== user._id) {
      sock.emit('authenticate', user._id);
      console.log(`[useSocketConnection] Authenticated with userId: ${user._id}`);
      lastUserIdRef.current = user._id;
    }

    // Skip auto-queue for private mode or private room games (room-based games handle their own flow)
    if (isPrivateMode || isPrivateRoomGame) {
      console.log(`[useSocketConnection] Private mode${isPrivateRoomGame ? ' room game' : ''} - skipping auto-queue (room-based flow)`);
      // Emit room mode so server knows this socket is for private room gameplay
      sock.emit('room-mode-connected', { mode, roomCode });
      return;
    }

    // Only join queues once per socket connection
    if (hasSetupRef.current) return;
    hasSetupRef.current = true;

    // Delay queue join to ensure authentication is processed
    setTimeout(() => {
      // Two-hands mode: join the two-hands queue when connected
      if (isTwoHandsMode) {
        sock.emit('join-two-hands-queue');
        console.log('[useSocketConnection] Joined two-hands queue');
      }

      // Party mode: join the party queue when connected
      if (isPartyMode) {
        sock.emit('join-party-queue');
        console.log('[useSocketConnection] Joined party queue');
      }

      // Three-hands mode: join the three-hands queue when connected
      if (mode === 'three-hands') {
        sock.emit('join-three-hands-queue');
        console.log('[useSocketConnection] Joined three-hands queue');
      }

      // Four-hands mode: join the four-hands queue when connected
      if (mode === 'four-hands') {
        sock.emit('join-four-hands-queue');
        console.log('[useSocketConnection] Joined four-hands queue');
      }

      // Free-for-all mode: join the freeforall queue when connected
      if (mode === 'freeforall') {
        sock.emit('join-freeforall-queue');
        console.log('[useSocketConnection] Joined freeforall queue');
      }

      // Tournament mode: join the tournament queue when connected
      if (mode === 'tournament') {
        sock.emit('join-tournament-queue');
        console.log('[useSocketConnection] Joined tournament queue');
      }
    }, 200);
    
    // Party mode: join the party queue when connected
    if (isPartyMode) {
      sock.emit('join-party-queue');
      console.log('[useSocketConnection] Joined party queue');
    }
    
    // Three-hands mode: join the three-hands queue when connected
    if (mode === 'three-hands') {
      sock.emit('join-three-hands-queue');
      console.log('[useSocketConnection] Joined three-hands queue');
    }
    
    // Four-hands mode: join the four-hands queue when connected
    if (mode === 'four-hands') {
      sock.emit('join-four-hands-queue');
      console.log('[useSocketConnection] Joined four-hands queue');
    }
    
    // Free-for-all mode: join the freeforall queue when connected
    if (mode === 'freeforall') {
      sock.emit('join-freeforall-queue');
      console.log('[useSocketConnection] Joined freeforall queue');
    }
    
    // Tournament mode: join the tournament queue when connected
    if (mode === 'tournament') {
      sock.emit('join-tournament-queue');
      console.log('[useSocketConnection] Joined tournament queue');
    }
  }, [mode, isPartyMode, isTwoHandsMode, isPrivateMode, isPrivateRoomGame, roomCode, user]);

  // Connect the shared socket on mount
  useEffect(() => {
    console.log('[useSocketConnection] Requesting shared socket connection...');
    
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
