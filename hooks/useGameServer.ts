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
        requestAnimationFrame(() => {
          setState(prev => ({
            ...prev,
            gameState: data.gameState,
            playerNumber: data.playerNumber,
          }));
        });
      },

      handleGameUpdate: (data: any) => {
        requestAnimationFrame(() => {
          setState(prev => ({ ...prev, gameState: data }));
        });
      },

      handleError: (error: any) => {
        requestAnimationFrame(() => {
          setState(prev => ({ ...prev, error }));
        });
      },

      // Named handlers so they can be removed on cleanup
      handleBuildOptions: (options: any) => {
        requestAnimationFrame(() => {
          setState(prev => ({ ...prev, buildOptions: options }));
        });
      },

      handleActionChoices: (data: any) => {
        requestAnimationFrame(() => {
          setState(prev => ({ ...prev, actionChoices: data }));
        });
      },
    };

    // Attach all listeners
    socket.on("connect", handlersRef.current.handleConnect);
    socket.on("disconnect", handlersRef.current.handleDisconnect);
    socket.on("game-start", handlersRef.current.handleGameStart);
    socket.on("game-update", handlersRef.current.handleGameUpdate);
    socket.on("error", handlersRef.current.handleError);
    socket.on("build-options", handlersRef.current.handleBuildOptions);
    socket.on("action-choices", handlersRef.current.handleActionChoices);

    return () => {
      // Clean up ALL listeners (including previously-anonymous ones)
      const handlers = handlersRef.current;
      socket.off("connect", handlers.handleConnect);
      socket.off("disconnect", handlers.handleDisconnect);
      socket.off("game-start", handlers.handleGameStart);
      socket.off("game-update", handlers.handleGameUpdate);
      socket.off("error", handlers.handleError);
      socket.off("build-options", handlers.handleBuildOptions);
      socket.off("action-choices", handlers.handleActionChoices);
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
