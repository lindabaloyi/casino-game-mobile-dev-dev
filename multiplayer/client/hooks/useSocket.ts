import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

interface GameState {
  players: string[];
  currentTurn: number;
  deck: string[];
}

interface SocketEventHandlers {
  setGameState: (gameState: GameState | null) => void;
  setPlayerNumber: (playerNumber: number | null) => void;
  setServerError?: (error: { message: string }) => void;
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
  connect: () => {
    // Connect handler - socket parameter removed as unused
  },

  "game-start": (data: { gameState: GameState; playerNumber: number }) => {
    handlers.setGameState(data.gameState);
    handlers.setPlayerNumber(data.playerNumber);
  },

  "game-update": (updatedGameState: GameState) => {
    handlers.setGameState(updatedGameState);
  },

  error: (data: { message: string }) => {
    console.error(`[CLIENT] Server error:`, data.message);
    // Emit error event that components can listen to
    handlers.setServerError?.(data);
  },

  disconnect: (reason: string) => {},

  connect_error: (error: Error) => {
    console.error(`[CLIENT] Connection error:`, error.message || error);
  },

  reconnect: (attemptNumber: number) => {},

  reconnect_attempt: (attemptNumber: number) => {},

  reconnect_error: (error: Error) => {
    console.error(`[CLIENT] Reconnect error:`, error.message || error);
  },
});

export const useSocket = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);

  const socketInstance = useMemo(() => {
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
      setPlayerNumber,
      setServerError: setError,
    });

    // Register event handlers using the centralized factory
    Object.entries(handlers).forEach(([event, handler]) => {
      socketInstance.on(event, handler);
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance, setGameState, setPlayerNumber, setError]);

  const clearError = () => {
    setError(null);
  };

  const sendAction = (action: any) => {
    if (socketInstance) {
      socketInstance.emit("game-action", action);
    }
  };

  return { gameState, playerNumber, sendAction, error, clearError };
};
