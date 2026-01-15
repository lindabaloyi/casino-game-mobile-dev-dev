import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

interface GameState {
  deck: any[];
  playerHands: any[][];
  tableCards: any[];
  playerCaptures: any[][];
  currentPlayer: number;
  round: number;
  scores: number[];
  gameOver: boolean;
  winner: number | null;
  lastCapturer: number | null;
  scoreDetails: any;
}

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const useSocket = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [buildOptions, setBuildOptions] = useState<any>(null);
  const [actionChoices, setActionChoices] = useState<any>(null);
  const [error, setError] = useState<{ message: string } | null>(null);

  const socketInstance = useMemo(() => {
    return io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }, []);

  useEffect(() => {
    socketInstance.on('connect', () => {
      // Connect handler - optimized for production
    });

    socketInstance.on('game-start', (data: { gameState: GameState; playerNumber: number }) => {
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
    });

    socketInstance.on('game-update', (updatedGameState: GameState) => {
      setGameState(updatedGameState);
    });

    socketInstance.on('error', (error: { message: string }) => {
      setError(error);
    });

    socketInstance.on('disconnect', (reason) => {
      // Disconnect handler - optimized for production
    });

    socketInstance.on('connect_error', (error) => {
      console.error(`Connection error:`, error.message || error);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      // Reconnect handler - optimized for production
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      // Reconnect attempt handler - optimized for production
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error(`Reconnect error:`, error.message || error);
    });

    socketInstance.on('build-options', (options: any) => {
      setBuildOptions(options);
    });

    socketInstance.on('action-choices', (data: any) => {
      setActionChoices({
        requestId: data.requestId,
        actions: data.actions.map((action: any) => ({
          type: action.type,
          label: action.label,
          payload: action.payload
        }))
      });
    });

    socketInstance.on('action-failed', (data: any) => {
      if (data.resetCard && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cardDragFailed', {
          detail: {
            card: data.resetCard,
            reason: data.error
          }
        }));
      }
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance]);

  const sendAction = (action: any) => {
    if (!socketInstance) {
      return;
    }

    if (action.type === 'card-drop') {
      socketInstance.emit('card-drop', action.payload);
    } else if (action.type === 'execute-action') {
      socketInstance.emit('execute-action', { action: action.payload });
    } else {
      socketInstance.emit('game-action', action);
    }
  };

  const clearBuildOptions = () => {
    setBuildOptions(null);
  };

  const clearError = () => {
    setError(null);
  };

  return { gameState, playerNumber, sendAction, buildOptions, clearBuildOptions, actionChoices, error, clearError };
};
