/**
 * useMultiplayerGame
 * 
 * Unified hook for all multiplayer game state on the client.
 * Supports both 2-player (2-hands) and 4-player party games.
 * 
 * This hook composes smaller, focused hooks:
 * - useSocketConnection: Handles socket connection lifecycle
 * - useGameStateSync: Handles game state synchronization
 * - useLobbyState: Handles party mode lobby (party mode only)
 * - useOpponentDrag: Handles real-time opponent drag for ghost cards
 * 
 * @example
 * // 2-player game (2 hands)
 * const game = useMultiplayerGame({ mode: '2-hands' });
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

export type GameMode = 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'freeforall' | 'tournament';

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
  /** Whether we're in the lobby waiting for players (multiplayer modes) */
  isInLobby: boolean;
  /** Number of players currently in the lobby */
  playersInLobby: number;
  /** Required number of players to start the game */
  requiredPlayers: number;
  /** Whether the local player is ready */
  isReady: boolean;
  /** Whether all required players have joined (for multiplayer modes) */
  allPlayersReady: boolean;
  /** Toggle ready status */
  toggleReady: () => void;
  /** Player info from server lobby (when available) */
  lobbyPlayers: ReturnType<typeof useLobbyState>['lobbyPlayers'];
  /** Room code for sharing with friends (null for private rooms - use room hook instead) */
  roomCode: string | null;
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

// Helper to get player count from game mode
export function getPlayerCount(mode: GameMode): number {
  switch (mode) {
    case 'party':
    case 'freeforall':
    case 'four-hands':
    case 'tournament':
      return 4;
    case 'three-hands':
      return 3;
    case 'two-hands':
    default:
      return 2;
  }
}

export function useMultiplayerGame(options: UseMultiplayerGameOptions): UseMultiplayerGameResult {
  const { mode } = options;
  const isPartyMode = mode === 'party';
  const isFreeForAllMode = mode === 'freeforall' || mode === 'four-hands' || mode === 'tournament';
  const playerCount = getPlayerCount(mode);

  // Compose smaller, focused hooks
  const { socket, isConnected, error: socketError } = useSocketConnection({ mode });
  const gameSync = useGameStateSync(socket);
  const lobby = useLobbyState(socket, playerCount);
  const opponentDrag = useOpponentDrag(socket);

  // Debug: Log lobby state values
  console.log(`[useMultiplayerGame] mode: ${mode}, playerCount: ${playerCount}, isInLobby: ${lobby.isInLobby}, playersInLobby: ${lobby.playersInLobby}, requiredPlayers: ${lobby.requiredPlayers}, allPlayersReady: ${lobby.allPlayersReady}`);
  const startNextRound = useCallback(() => {
    // Party and Free-for-all modes need manual round transitions
    if (isPartyMode || isFreeForAllMode) {
      socket?.emit('start-next-round');
    } else {
      // 2-hands mode: server handles round transitions automatically
      console.log('[useMultiplayerGame] startNextRound called - server handles transitions automatically');
    }
  }, [socket, isPartyMode, isFreeForAllMode]);

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
    
    // Lobby state (multiplayer modes)
    isInLobby: lobby.isInLobby,
    playersInLobby: lobby.playersInLobby,
    requiredPlayers: lobby.requiredPlayers,
    isReady: lobby.isReady,
    allPlayersReady: lobby.allPlayersReady,
    toggleReady: lobby.toggleReady,
    lobbyPlayers: lobby.lobbyPlayers,
    roomCode: lobby.roomCode,
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
