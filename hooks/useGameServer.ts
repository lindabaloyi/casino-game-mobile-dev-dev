import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../multiplayer/server/game-logic/game-state';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface GameServerState {
  gameState: GameState | null;
  playerNumber: number | null;
  buildOptions: any;
  actionChoices: any;
  error: { message: string } | null;
  isConnected: boolean;
}

export function useGameServer() {
  const [state, setState] = useState<GameServerState>({
    gameState: null,
    playerNumber: null,
    buildOptions: null,
    actionChoices: null,
    error: null,
    isConnected: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<any>({});

  // Initialize socket ONCE
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    // Store handlers in ref to use in cleanup
    handlersRef.current = {
      handleConnect: () => {
        console.log("✅ [WS] Connected");
        setState(prev => ({ ...prev, isConnected: true }));
      },

      handleDisconnect: () => {
        setState(prev => ({ ...prev, isConnected: false }));
      },

      handleGameStart: (data: any) => {
        // Schedule state update on next frame
        requestAnimationFrame(() => {
          setState(prev => ({
            ...prev,
            gameState: data.gameState,
            playerNumber: data.playerNumber,
          }));
        });
      },

      handleGameUpdate: (data: any) => {
        // Schedule update on next frame (NOT during render)
        requestAnimationFrame(() => {
          const gameStateUpdate = data._meta ? data : data;
          setState(prev => ({ ...prev, gameState: gameStateUpdate }));
        });

        // Non-critical work goes to setTimeout (not blocking render)
        setTimeout(() => {
          // Your cleanup and tracking logic here
          console.log('🔄 Game updated (non-blocking)');
        }, 0);
      },

      handleError: (error: any) => {
        requestAnimationFrame(() => {
          setState(prev => ({ ...prev, error }));
        });
      }
    };

    // Attach all listeners
    socket.on("connect", handlersRef.current.handleConnect);
    socket.on("disconnect", handlersRef.current.handleDisconnect);
    socket.on("game-start", handlersRef.current.handleGameStart);
    socket.on("game-update", handlersRef.current.handleGameUpdate);
    socket.on("error", handlersRef.current.handleError);
    socket.on("build-options", (options: any) => {
      requestAnimationFrame(() => {
        setState(prev => ({ ...prev, buildOptions: options }));
      });
    });
    socket.on("action-choices", (data: any) => {
      requestAnimationFrame(() => {
        setState(prev => ({ ...prev, actionChoices: data }));
      });
    });

    return () => {
      // Clean up ALL listeners
      const handlers = handlersRef.current;
      socket.off("connect", handlers.handleConnect);
      socket.off("disconnect", handlers.handleDisconnect);
      socket.off("game-start", handlers.handleGameStart);
      socket.off("game-update", handlers.handleGameUpdate);
      socket.off("error", handlers.handleError);
      socket.close();
    };
  }, []); // Empty deps - runs once

  const sendAction = (action: any) => {
    const socket = socketRef.current;
    if (!socket || !action?.type) return;

    // Send immediately (not in render cycle)
    socket.emit("game-action", action);
  };

  const clearError = () => {
    requestAnimationFrame(() => {
      setState(prev => ({ ...prev, error: null }));
    });
  };

  return {
    ...state,
    sendAction,
    clearError,
  };
}
