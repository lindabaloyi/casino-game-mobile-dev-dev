/**
 * useGameState
 * Single hook for all multiplayer game state on the client.
 *
 * Responsibilities:
 *  - Open the Socket.IO connection (once, on mount)
 *  - Listen for game-start / game-update / player-disconnected / error
 *  - Expose the current game state + a sendAction() helper
 *
 * Usage:
 *   const { gameState, playerNumber, isConnected, error, sendAction } = useGameState();
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
  gameOver: boolean;
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
    });

    socket.on('game-update', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game-state-sync', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    });

    socket.on('player-disconnected', () => {
      setOpponentDisconnected(true);
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      // Request fresh state after error to stay in sync
      setTimeout(() => {
        socket.emit('request-sync');
      }, 100);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game-start');
      socket.off('game-update');
      socket.off('game-state-sync');
      socket.off('player-disconnected');
      socket.off('error');
      socket.disconnect();
    };
  }, []); // connect once on mount

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendAction = (action: { type: string; payload?: Record<string, unknown> }) => {
    socketRef.current?.emit('game-action', action);
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
  };
}

export default useGameState;
