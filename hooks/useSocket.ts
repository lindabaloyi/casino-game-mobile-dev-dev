import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
console.log("[ENV] SOCKET_URL read from .env:", process.env.EXPO_PUBLIC_SOCKET_URL);
console.log("[ENV] Final SOCKET_URL used:", SOCKET_URL);

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [buildOptions, setBuildOptions] = useState<any>(null);
  const [actionChoices, setActionChoices] = useState<any>(null);
  const [error, setError] = useState<{ message: string } | null>(null);

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
      setGameState(updatedGameState);
    });

    socketInstance.on('error', (error: { message: string }) => {
      console.log('[CLIENT] Server error:', error.message);
      setError(error);
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

    socketInstance.on('build-options', (options: any) => {
      console.log('[CLIENT] Build options received:', options);
      setBuildOptions(options);
    });

    socketInstance.on('action-choices', (data: any) => {
      console.log(`🎛️ [CLIENT] Action choices received from server:`, {
        requestId: data.requestId,
        actionCount: data.actions?.length || 0,
        actions: data.actions?.map((a: any) => ({ type: a.type, label: a.label })) || []
      });
      setActionChoices({
        requestId: data.requestId,
        actions: data.actions.map((action: any) => ({
          type: action.type,
          label: action.label,
          payload: action.payload
        }))
      });
    });

    return () => {
      socketInstance.close();
    };
  }, [socketInstance]);

  const sendAction = (action: any) => {
    const timestamp = new Date().toISOString();
    if (!socketInstance) {
      console.warn(`[${timestamp}][CLIENT] Attempted to send action but socket is null:`, action);
      return;
    }

    // Phase 2: Route actions to appropriate socket events
    if (action.type === 'card-drop') {
      console.log(`📤 [CLIENT] Sending card-drop event:`, {
        draggedCard: action.payload.draggedItem.card.rank + action.payload.draggedItem.card.suit,
        targetInfo: action.payload.targetInfo,
        requestId: action.payload.requestId
      });
      socketInstance.emit('card-drop', action.payload);
    } else if (action.type === 'execute-action') {
      console.log(`🔄 [CLIENT] Sending execute-action:`, {
        actionType: action.payload.type,
        payload: action.payload.payload
      });
      socketInstance.emit('execute-action', { action: action.payload });
    } else {
      // Legacy game-action for existing functionality
      console.log(`[${timestamp}][CLIENT] Sending game-action: ${action.type || 'unknown'}, data:`, action);
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
