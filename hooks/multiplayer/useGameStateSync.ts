/**
 * useGameStateSync
 * 
 * Handles game state synchronization from the server.
 * 
 * Responsibilities:
 *  - Listen for game events (game-start, game-update, round-end, game-over)
 *  - Manage local game state
 *  - Handle player disconnection
 *  - Expose game actions
 * 
 * Usage:
 *   const { gameState, gameOverData, playerNumber, sendAction, requestSync } = useGameStateSync(socket);
 */

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameState {
  deck: Card[];
  players: {
    id: number;
    name: string;
    hand: Card[];
    captures: Card[];
    score: number;
    team?: 'A' | 'B';
  }[];
  tableCards: Card[];
  currentPlayer: number;
  round: number;
  scores: number[];
  teamScores: [number, number];
  playerCount: number;
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
  roundEndReason?: 'cards_depleted' | 'max_moves' | 'all_cards_played' | 'all_players_acted';
  roundPlayers?: Record<number, {
    playerId: number;
    turnStarted: boolean;
    turnEnded: boolean;
    actionTriggered: boolean;
    actionCompleted: boolean;
  }>;
}

export interface GameOverData {
  winner: number;
  finalScores: number[];
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
}

export interface UseGameStateSyncResult {
  /** Current game state from server */
  gameState: GameState | null;
  /** Game over data for modal display */
  gameOverData: GameOverData | null;
  /** Player number (0-3) */
  playerNumber: number | null;
  /** Whether opponent disconnected */
  opponentDisconnected: boolean;
  /** Error message */
  error: string | null;
  /** Send game action to server */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Request state sync from server */
  requestSync: () => void;
  /** Clear error */
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGameStateSync(socket: Socket | null): UseGameStateSyncResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle game-start event
  useEffect(() => {
    if (!socket) return;

    const handleGameStart = (data: { gameState: GameState; playerNumber: number }) => {
      console.log('[useGameStateSync] game-start received:', data);
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
      setOpponentDisconnected(false);
      setError(null);
      setGameOverData(null);
    };

    socket.on('game-start', handleGameStart);

    return () => {
      socket.off('game-start', handleGameStart);
    };
  }, [socket]);

  // Handle game-update event
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdate = (state: GameState) => {
      console.log('[useGameStateSync] game-update received, round:', state.round);
      setGameState(state);
    };

    socket.on('game-update', handleGameUpdate);

    return () => {
      socket.off('game-update', handleGameUpdate);
    };
  }, [socket]);

  // Handle round-end event
  useEffect(() => {
    if (!socket) return;

    const handleRoundEnd = (data: {
      round: number;
      reason: 'cards_depleted' | 'max_moves';
    }) => {
      console.log('[useGameStateSync] round-end received:', data);
      setGameState(prev => prev ? {
        ...prev,
        round: data.round,
        roundEndReason: data.reason,
      } : null);
    };

    socket.on('round-end', handleRoundEnd);

    return () => {
      socket.off('round-end', handleRoundEnd);
    };
  }, [socket]);

  // Handle game-over event
  useEffect(() => {
    if (!socket) return;

    const handleGameOver = (data: GameOverData) => {
      console.log('[useGameStateSync] game-over received:', data);
      setGameOverData(data);
    };

    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [socket]);

  // Handle player disconnection
  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = () => {
      console.log('[useGameStateSync] player-disconnected received');
      setOpponentDisconnected(true);
    };

    socket.on('player-disconnected', handlePlayerDisconnected);

    return () => {
      socket.off('player-disconnected', handlePlayerDisconnected);
    };
  }, [socket]);

  // Handle errors
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      console.log('[useGameStateSync] error received:', data.message);
      setError(data.message);
      
      // Request sync after error
      setTimeout(() => {
        socket.emit('request-sync');
      }, 100);
    };

    socket.on('error', handleError);

    return () => {
      socket.off('error', handleError);
    };
  }, [socket]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendAction = useCallback((action: { type: string; payload?: Record<string, unknown> }) => {
    socket?.emit('game-action', action);
  }, [socket]);

  const requestSync = useCallback(() => {
    socket?.emit('request-sync');
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    gameState,
    gameOverData,
    playerNumber,
    opponentDisconnected,
    error,
    sendAction,
    requestSync,
    clearError,
  };
}

export default useGameStateSync;
