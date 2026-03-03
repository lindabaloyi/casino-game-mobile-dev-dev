/**
 * useGameState
 * Single hook for all multiplayer game state on the client.
 *
 * Responsibilities:
 *  - Open the Socket.IO connection (once, on mount)
 *  - Listen for game-start / game-update / player-disconnected / error
 *  - Expose the current game state + a sendAction() helper
 *  - Handle drag events for real-time shared state
 *
 * Usage:
 *   const { gameState, playerNumber, isConnected, error, sendAction } = useGameState();
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { throttle } from '../utils/throttle';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameState {
  deck: Card[];
  playerHands: Card[][];
  tableCards: Card[];
  playerCaptures: Card[][];
  currentPlayer: number;
  round: number;
  scores: number[];
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
  roundEndReason?: 'cards_depleted' | 'max_moves' | 'all_cards_played';
}

/** Opponent drag state for real-time ghost card rendering */
export interface OpponentDragState {
  playerIndex: number;
  card: Card;
  cardId: string; // Unique ID like "AH" for Ace of Hearts
  source: 'hand' | 'table' | 'captured';
  position: { x: number; y: number }; // normalized 0-1
  isDragging: boolean;
  // Target info for accurate final position
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
}

interface UseGameStateResult {
  /** Full game state from the server (null until game-start is received) */
  gameState: GameState | null;
  /** Which player this client is (0 or 1) */
  playerNumber: number | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Whether the opponent disconnected */
  opponentDisconnected: boolean;
  /** Last error message from the server */
  error: string | null;
  /** Send any game action to the server */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Manually request the current server state (sync) */
  requestSync: () => void;
  /** Clear the last error */
  clearError: () => void;
  /** Current opponent drag state (for ghost card rendering) */
  opponentDrag: OpponentDragState | null;
  /** Emit drag start event */
  emitDragStart: (card: Card, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => void;
  /** Emit drag move event (throttled) */
  emitDragMove: (card: Card, position: { x: number; y: number }) => void;
  /** Emit drag end event */
  emitDragEnd: (card: Card, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
  /** Start the next round (called after round-end modal) */
  startNextRound: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameState(): UseGameStateResult {
  const socketRef = useRef<Socket | null>(null);

  const [gameState, setGameState]         = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber]   = useState<number | null>(null);
  const [isConnected, setIsConnected]     = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  
  // Opponent drag state for real-time ghost card rendering
  const [opponentDrag, setOpponentDrag] = useState<OpponentDragState | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    // ── Socket lifecycle ────────────────────────────────────────────────
    socket.on('connect',    () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // ── Game events ─────────────────────────────────────────────────────
    socket.on('game-start', (data: { gameState: GameState; playerNumber: number }) => {
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
      setOpponentDisconnected(false);
      setError(null);
      // Clear any stale opponent drag state on game start
      setOpponentDrag(null);
    });

    socket.on('game-update', (state: GameState) => {
      setGameState(state);
    });

    socket.on('round-end', (data: {
      round: number;
      reason: 'cards_depleted' | 'max_moves';
      summary: {
        round: number;
        movesPlayed: number;
        cardsRemaining: number;
        scores: number[];
        winner: number;
      };
    }) => {
      console.log('[useGameState] round-end received:', data);
      // Update game state with the round end info
      setGameState(prev => prev ? {
        ...prev,
        round: data.round,
        roundEndReason: data.reason,
      } : null);
    });

    socket.on('game-over', (data: {
      winner: number;
      finalScores: number[];
    }) => {
      console.log('[useGameState] game-over received:', data);
      setGameState(prev => prev ? {
        ...prev,
        gameOver: true,
        scores: data.finalScores,
      } : null);
    });

    socket.on('game-state-sync', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    });

    socket.on('player-disconnected', () => {
      setOpponentDisconnected(true);
      setOpponentDrag(null);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      // Request fresh state after error to stay in sync
      setTimeout(() => {
        socket.emit('request-sync');
      }, 100);
    });

    // ── Opponent drag events (for real-time ghost card) ─────────────────
    // Log all socket events for debugging
    socket.onAny((eventName, ...args) => {
      if (eventName.startsWith('opponent-')) {
        console.log('[useGameState] Socket event:', eventName, args);
      }
    });

    socket.on('opponent-drag-start', (data: {
      playerIndex: number;
      card: Card;
      cardId: string;
      source: 'hand' | 'table' | 'captured';
      position: { x: number; y: number };
    }) => {
      console.log('[useGameState] opponent-drag-start received:', data);
      setOpponentDrag({
        playerIndex: data.playerIndex,
        card: data.card,
        cardId: data.cardId,
        source: data.source,
        position: data.position,
        isDragging: true,
      });
    });

    socket.on('opponent-drag-move', (data: {
      playerIndex: number;
      card: Card;
      position: { x: number; y: number };
    }) => {
      // console.log('[useGameState] opponent-drag-move:', data);
      setOpponentDrag(prev => prev ? {
        ...prev,
        position: data.position,
      } : null);
    });

    socket.on('opponent-drag-end', (data: {
      playerIndex: number;
      card: Card;
      position: { x: number; y: number };
      outcome: 'success' | 'miss' | 'cancelled';
      targetType?: string;
      targetId?: string;
    }) => {
      console.log('[useGameState] opponent-drag-end received:', data);
      
      // Update state with target info for accurate final position
      setOpponentDrag(prev => prev ? {
        ...prev,
        targetType: data.targetType as any,
        targetId: data.targetId,
      } : null);
      
      // Clear opponent drag state after a short delay to allow for animation
      setTimeout(() => {
        setOpponentDrag(null);
      }, 500); // Increased delay for animation
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game-start');
      socket.off('game-update');
      socket.off('round-end');
      socket.off('game-over');
      socket.off('game-state-sync');
      socket.off('player-disconnected');
      socket.off('error');
      socket.off('opponent-drag-start');
      socket.off('opponent-drag-move');
      socket.off('opponent-drag-end');
      socket.disconnect();
    };
  }, []); // connect once on mount

  // ── Drag event emitters ──────────────────────────────────────────────

  const emitDragStart = useCallback((card: Card, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => {
    const cardId = `${card.rank}${card.suit}`;
    socketRef.current?.emit('drag-start', { card, cardId, source, position });
  }, []);

  // Throttled drag move - limit to ~60fps (16ms) to prevent network flooding
  const emitDragMove = useCallback(
    throttle((card: Card, position: { x: number; y: number }) => {
      socketRef.current?.emit('drag-move', { card, position });
    }, 16),
    []
  );

  const emitDragEnd = useCallback((card: Card, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => {
    socketRef.current?.emit('drag-end', { card, position, outcome, targetType, targetId });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendAction = (action: { type: string; payload?: Record<string, unknown> }) => {
    socketRef.current?.emit('game-action', action);
  };

  const startNextRound = () => {
    socketRef.current?.emit('start-next-round');
  };

  const requestSync = () => {
    socketRef.current?.emit('request-sync');
  };

  const clearError = () => setError(null);

  return {
    gameState,
    playerNumber,
    isConnected,
    opponentDisconnected,
    error,
    sendAction,
    requestSync,
    clearError,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
    startNextRound,
  };
}

export default useGameState;
