import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
// Utility function to create socket event handlers
const createSocketEventHandlers = (handlers: SocketEventHandlers) => ({
  connect: (socket: Socket) => {
    const timestamp = new Date().toISOString();
  },

  'game-start': (data: { gameState: GameState; playerNumber: number }) => {
    handlers.setGameState(data.gameState);
    handlers.setPlayerNumber(data.playerNumber);
  },

  'game-update': (updatedGameState: GameState) => {
    handlers.setGameState(updatedGameState);
  },

  disconnect: (reason: string) => {
    const timestamp = new Date().toISOString();
  },

  'connect_error': (error: Error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}][CLIENT] Connection error:`, error.message || error);
  },

  reconnect: (attemptNumber: number) => {
    const timestamp = new Date().toISOString();
  },

  'reconnect_attempt': (attemptNumber: number) => {
    const timestamp = new Date().toISOString();
  },

  'reconnect_error': (error: Error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}][CLIENT] Reconnect error:`, error.message || error);
  }
});

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);

  const socketInstance = useMemo(() => {
    return io(SOCKET_CONFIG.URL, {
      transports: SOCKET_CONFIG.TRANSPORTS,
      reconnection: true,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
    });
  }, []);

  useEffect(() => {
    setSocket(socketInstance);

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
    const timestamp = new Date().toISOString();
    if (socketInstance) {
      socketInstance.emit('game-action', action);
    } else {
    }
  };

  return { gameState, playerNumber, sendAction };
};
