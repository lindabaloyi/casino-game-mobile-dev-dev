/**
 * useSocket - Simplified single socket hook
 * 
 * Returns a shared singleton socket - no internal reconnections.
 * Used by all other multiplayer hooks.
 */

import { useState, useEffect } from 'react';
import { getCurrentSocket, isSocketConnected, onSocketStateChange } from './multiplayer/socketManager';

export interface UseSocketResult {
  socket: any | null;
  isConnected: boolean;
}

export function useSocket(): UseSocketResult {
  const [socket, setSocket] = useState<any | null>(getCurrentSocket());
  const [isConnected, setIsConnected] = useState(isSocketConnected());

  useEffect(() => {
    const unsubscribe = onSocketStateChange((connected, sock) => {
      setSocket(sock);
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { socket, isConnected };
}

export default useSocket;