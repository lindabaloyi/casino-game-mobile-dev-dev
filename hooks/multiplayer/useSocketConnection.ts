/**
 * useSocketConnection
 * 
 * Handles Socket.IO connection lifecycle with auto-detection of server URL.
 * Supports both desktop (localhost) and mobile (LAN IP) connections.
 * 
 * Responsibilities:
 *  - Resolve optimal server URL based on network context
 *  - Establish socket connection
 *  - Handle connection/disconnection events
 *  - Manage reconnection settings
 * 
 * Usage:
 *   const { socket, isConnected } = useSocketConnection({ mode: '2-hands' });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { getOptimalServerUrl } from '../../utils/serverUrl';

<<<<<<< HEAD
export type GameMode = 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'freeforall';
=======
export type GameMode = '2-hands' | 'party';
>>>>>>> sort-building

export interface UseSocketConnectionOptions {
  mode: GameMode;
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
  const { mode } = options;
  const isPartyMode = mode === 'party';
  const isTwoHandsMode = mode === 'two-hands';
  
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track mount state to prevent state updates after unmount
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (socketRef.current?.connected) {
      return;
    }
    
    getOptimalServerUrl()
      .then(socketUrl => {
        if (!isMounted.current) return;
        
        console.log(`[useSocketConnection] Connecting to: ${socketUrl} (mode: ${mode})`);
        
        const socket = io(socketUrl, {
          transports: ['websocket', 'polling'], // Polling as fallback
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        
        socketRef.current = socket;
        
        socket.on('connect', () => {
          console.log('[useSocketConnection] Connected');
          setSocket(socket); // Set socket as state to trigger re-render
          setIsConnected(true);
          setError(null);
          
          // Two-hands mode: join the two-hands queue when connected
          if (isTwoHandsMode) {
            socket.emit('join-two-hands-queue');
            console.log('[useSocketConnection] Joined two-hands queue');
          }
          
          // Party mode: join the party queue when connected
          if (isPartyMode) {
            socket.emit('join-party-queue');
            console.log('[useSocketConnection] Joined party queue');
          }
          
          // Three-hands mode: join the three-hands queue when connected
          if (mode === 'three-hands') {
            socket.emit('join-three-hands-queue');
            console.log('[useSocketConnection] Joined three-hands queue');
          }
          
          // Four-hands mode: join the four-hands queue when connected
          if (mode === 'four-hands') {
            socket.emit('join-four-hands-queue');
            console.log('[useSocketConnection] Joined four-hands queue');
          }
          
          // Free-for-all mode: join the freeforall queue when connected
          if (mode === 'freeforall') {
            socket.emit('join-freeforall-queue');
            console.log('[useSocketConnection] Joined freeforall queue');
          }
        });
        
        socket.on('disconnect', () => {
          console.log('[useSocketConnection] Disconnected');
          setIsConnected(false);
        });
        
        socket.on('connect_error', (err) => {
          console.error('[useSocketConnection] Connection error:', err.message);
          setError(err.message);
        });
      })
      .catch(err => {
        console.error('[useSocketConnection] Failed to resolve URL:', err);
        setError(err.message);
      });
  }, [mode, isPartyMode, isTwoHandsMode]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null); // Clear state too
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    
    return () => {
      isMounted.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null); // Clear state on unmount
      }
    };
  }, [connect]);

  return {
    socket, // Now returns state, not ref - this triggers re-render when socket connects!
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}

export default useSocketConnection;
