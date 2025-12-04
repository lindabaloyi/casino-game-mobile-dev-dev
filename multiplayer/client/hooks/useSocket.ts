import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface GameState {
  players: string[];
  currentTurn: number;
  deck: string[];
}

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";
console.log("[ENV] SOCKET_URL read from .env:", process.env.EXPO_PUBLIC_SOCKET_URL);
console.log("[ENV] Final SOCKET_URL used:", SOCKET_URL);

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);

  const socketInstance = useMemo(() => {
    console.log("[SOCKET] Creating connection to:", SOCKET_URL);
    return io(SOCKET_URL, {
      transports: ["websocket"], // disable polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }, []);

  useEffect(() => {
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}][CLIENT] Connected to server, socket.id: ${socketInstance.id}`);
      console.log(`[${timestamp}][CLIENT] Connection details:`, {
        id: socketInstance.id,
        connected: socketInstance.connected,
        transport: socketInstance.io.engine.transport.name
      });
    });

    socketInstance.on('game-start', (data: { gameState: GameState; playerNumber: number }) => {
      console.log('[CLIENT] Game started:', data);
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
    });

    socketInstance.on('game-update', (updatedGameState: GameState) => {
      console.log('[CLIENT] Game state updated:', {
        currentPlayer: updatedGameState.currentTurn,
        players: updatedGameState.players?.length || 0
      });
      setGameState(updatedGameState);
    });

    socketInstance.on('disconnect', (reason) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}][CLIENT] Disconnected from server, reason: ${reason}`);
      console.log(`[${timestamp}][CLIENT] Disconnect details:`, {
        id: socketInstance.id,
        connected: socketInstance.connected
      });
    });

    socketInstance.on('connect_error', (error) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}][CLIENT] Connection error:`, error.message || error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}][CLIENT] Reconnected after ${attemptNumber} attempts`);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}][CLIENT] Reconnect attempt ${attemptNumber}`);
    });

    socketInstance.on('reconnect_error', (error) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}][CLIENT] Reconnect error:`, error.message || error);
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance]);

  const sendAction = (action: any) => {
    const timestamp = new Date().toISOString();
    if (socketInstance) {
      console.log(`[${timestamp}][CLIENT] Sending game-action: ${action.type || 'unknown'}, data:`, action);
      socketInstance.emit('game-action', action);
    } else {
      console.warn(`[${timestamp}][CLIENT] Attempted to send action but socket is null:`, action);
    }
  };

  return { gameState, playerNumber, sendAction };
};
