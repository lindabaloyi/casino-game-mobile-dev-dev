import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

interface GameState {
  players: string[];
  currentTurn: number;
  deck: string[];
}

interface SocketEventHandlers {
  setGameState: (gameState: GameState | null) => void;
  setPlayerNumber: (playerNumber: number | null) => void;
}

// Socket configuration constants
const SOCKET_CONFIG = {
  URL: process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001",
  TRANSPORTS: ["websocket"],
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1500,
};

console.log("[ENV] SOCKET_URL read from .env:", process.env.EXPO_PUBLIC_SOCKET_URL);
console.log("[ENV] Final SOCKET_URL used:", SOCKET_CONFIG.URL);

// Utility function to create socket event handlers
const createSocketEventHandlers = (handlers: SocketEventHandlers) => ({
<<<<<<< HEAD
  connect: () => {
    // Connect handler - socket parameter removed as unused
=======
  connect: (socket: Socket) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}][CLIENT] Connected to server, socket.id: ${socket.id}`);
    console.log(`[${timestamp}][CLIENT] Connection details:`, {
      id: socket.id,
      connected: socket.connected,
      transport: socket.io.engine.transport.name
    });
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
  },

  'game-start': (data: { gameState: GameState; playerNumber: number }) => {
    console.log('[CLIENT] Game started:', data);
    handlers.setGameState(data.gameState);
    handlers.setPlayerNumber(data.playerNumber);
  },

  'game-update': (updatedGameState: GameState) => {
    console.log('[CLIENT] Game state updated:', {
      currentPlayer: updatedGameState.currentTurn,
      players: updatedGameState.players?.length || 0
    });
    handlers.setGameState(updatedGameState);
  },

  disconnect: (reason: string) => {
<<<<<<< HEAD
=======
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}][CLIENT] Disconnected from server, reason: ${reason}`);
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
  },

  'connect_error': (error: Error) => {
    console.error(`[CLIENT] Connection error:`, error.message || error);
  },

  reconnect: (attemptNumber: number) => {
<<<<<<< HEAD
  },

  'reconnect_attempt': (attemptNumber: number) => {
=======
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}][CLIENT] Reconnected after ${attemptNumber} attempts`);
  },

  'reconnect_attempt': (attemptNumber: number) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}][CLIENT] Reconnect attempt ${attemptNumber}`);
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
  },

  'reconnect_error': (error: Error) => {
    console.error(`[CLIENT] Reconnect error:`, error.message || error);
  }
});

export const useSocket = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);

  const socketInstance = useMemo(() => {
    console.log("[SOCKET] Creating connection to:", SOCKET_CONFIG.URL);
    return io(SOCKET_CONFIG.URL, {
      transports: SOCKET_CONFIG.TRANSPORTS,
      reconnection: true,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
    });
  }, []);

  useEffect(() => {
    // Create event handlers using the factory function
    const handlers = createSocketEventHandlers({
      setGameState,
      setPlayerNumber
    });

    // Register event handlers using the centralized factory
    Object.entries(handlers).forEach(([event, handler]) => {
      socketInstance.on(event, handler);
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance, setGameState, setPlayerNumber]);

  const sendAction = (action: any) => {
    if (socketInstance) {
      console.log(`[${timestamp}][CLIENT] Sending game-action: ${action.type || 'unknown'}, data:`, action);
      socketInstance.emit('game-action', action);
    } else {
      console.warn(`[${timestamp}][CLIENT] Attempted to send action but socket is null:`, action);
    }
  };

  return { gameState, playerNumber, sendAction };
};
