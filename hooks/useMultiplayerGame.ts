/**
 * useMultiplayerGame
 * 
 * Unified hook for all multiplayer game state on the client.
 * Supports both 2-player and 4-player party games.
 * 
 * This hook composes smaller, focused hooks:
 * - useSocketConnection: Handles socket connection lifecycle
 * - useGameStateSync: Handles game state synchronization
 * - useLobbyState: Handles party mode lobby (party mode only)
 * - useOpponentDrag: Handles real-time opponent drag for ghost cards
 * 
 * @example
 * // 2-player game
 * const game = useMultiplayerGame({ mode: 'duel' });
 * 
 * // 4-player party game
 * const game = useMultiplayerGame({ mode: 'party' });
 */

import { useSocketConnection, useGameStateSync, useLobbyState, useOpponentDrag } from './multiplayer';
import type { Card, GameState, GameOverData, OpponentDragState } from './multiplayer';
import { useCallback } from 'react';

// Re-export types for backward compatibility
export type { Card, GameState, GameOverData, OpponentDragState };

// ── Types ─────────────────────────────────────────────────────────────────────

export type GameMode = 'duel' | 'party';

export interface UseMultiplayerGameOptions {
  mode: GameMode;
}

export interface UseMultiplayerGameResult {
  /** Full game state from the server (null until game-start is received) */
  gameState: ReturnType<typeof useGameStateSync>['gameState'];
  /** Game over data from server (for consistent modal display) */
  gameOverData: ReturnType<typeof useGameStateSync>['gameOverData'];
  /** Which player this client is (0-3) */
  playerNumber: ReturnType<typeof useGameStateSync>['playerNumber'];
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Whether we're in the lobby waiting for players (party mode only) */
  isInLobby: boolean;
  /** Number of players currently in the lobby (party mode only) */
  playersInLobby: number;
  /** Whether the opponent disconnected */
  opponentDisconnected: boolean;
  /** Whether a player disconnected (party mode) */
  playerDisconnected: boolean;
  /** Last error message from the server */
  error: string | null;
  /** Send any game action to the server */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Manually request the current server state (sync) */
  requestSync: () => void;
  /** Clear the last error */
  clearError: () => void;
  /** Current opponent drag state (for ghost card rendering) */
  opponentDrag: ReturnType<typeof useOpponentDrag>['opponentDrag'];
  /** Emit drag start event */
  emitDragStart: ReturnType<typeof useOpponentDrag>['emitDragStart'];
  /** Emit drag move event (throttled) */
  emitDragMove: ReturnType<typeof useOpponentDrag>['emitDragMove'];
  /** Emit drag end event */
  emitDragEnd: ReturnType<typeof useOpponentDrag>['emitDragEnd'];
  /** Start the next round (called after round-end modal) */
  startNextRound: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMultiplayerGame(options: UseMultiplayerGameOptions): UseMultiplayerGameResult {
  const { mode } = options;
  const isPartyMode = mode === 'party';

  // Compose smaller, focused hooks
  const { socket, isConnected, error: socketError } = useSocketConnection({ mode });
  const gameSync = useGameStateSync(socket);
  const lobby = useLobbyState(socket, isPartyMode);
  const opponentDrag = useOpponentDrag(socket);

  // Start next round (party mode only)
  const startNextRound = useCallback(() => {
    if (isPartyMode) {
      socket?.emit('start-next-round');
    } else {
      // Duel mode: server handles round transitions automatically
      console.log('[useMultiplayerGame] startNextRound called - server handles transitions automatically');
    }
  }, [socket, isPartyMode]);

  // Combine results
  return {
    // Game state
    gameState: gameSync.gameState,
    gameOverData: gameSync.gameOverData,
    playerNumber: gameSync.playerNumber,
    opponentDisconnected: gameSync.opponentDisconnected,
    
    // Connection state
    isConnected,
    error: socketError || gameSync.error,
    
    // Lobby state (party mode)
    isInLobby: lobby.isInLobby,
    playersInLobby: lobby.playersInLobby,
    playerDisconnected: false, // TODO: Add to gameSync if needed
    
    // Actions
    sendAction: gameSync.sendAction,
    requestSync: gameSync.requestSync,
    clearError: gameSync.clearError,
    startNextRound,
    
    // Opponent drag
    opponentDrag: opponentDrag.opponentDrag,
    emitDragStart: opponentDrag.emitDragStart,
    emitDragMove: opponentDrag.emitDragMove,
    emitDragEnd: opponentDrag.emitDragEnd,
  };
}

export default useMultiplayerGame;
