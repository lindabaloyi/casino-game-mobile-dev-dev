/**
 * useOnlinePlayConnection
 * 
 * Unified hook that abstracts over private room and matchmaking connections.
 * Provides a single interface regardless of how the game was started.
 * 
 * Usage:
 *   const connection = useOnlinePlayConnection({ mode: 'party' });
 *   const connection = useOnlinePlayConnection({ mode: 'party', roomCode: 'ABC123' });
 */

import { useEffect, useMemo } from 'react';
import { useSocketConnection, useGameStateSync, useRoom } from './multiplayer';
import { useMultiplayerGame, type GameMode, type GameState, type GameOverData, type Card } from './useMultiplayerGame';
import type { OpponentDragState } from './multiplayer';

export interface UseOnlinePlayConnectionOptions {
  mode: GameMode;
  roomCode?: string | null;
}

export interface UseOnlinePlayConnectionResult {
  /** Full game state from the server (null until game-start is received) */
  gameState: GameState | null;
  /** Game over data from server (for consistent modal display) */
  gameOverData: GameOverData | null;
  /** Which player this client is (0-3) */
  playerNumber: number;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Number of players currently in the lobby */
  playersInLobby: number;
  /** Whether the local player is disconnected */
  playerDisconnected: boolean;
  /** Last error message from the server */
  error: string | null;
  /** Whether local game is ready (cards dealt) */
  gameReady: boolean;
  /** Whether all clients are ready */
  allClientsReady: boolean;
  /** Send any game action to the server */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Manually request the current server state (sync) */
  requestSync: () => void;
  /** Clear the last error */
  clearError: () => void;
  /** Start the next round (called after round-end modal) */
  startNextRound: () => void;
  /** Current opponent drag state (for ghost card rendering) */
  opponentDrag: OpponentDragState | null;
  /** Emit drag start event */
  emitDragStart: (card: Card, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => void;
  /** Emit drag move event (throttled) */
  emitDragMove: (card: Card, position: { x: number; y: number }) => void;
  /** Emit drag end event */
  emitDragEnd: (card: Card, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
  /** Room code for sharing (private rooms) or matchmaking code */
  roomCode: string | null;
  /** Room status for private rooms */
  roomStatus: string | null;
  /** Whether this is a private room connection */
  isPrivateRoom: boolean;
  /** Player info from server lobby (when available) */
  lobbyPlayers: { userId: string; username: string; avatar: string }[];
  /** Display format for PlayerCard component */
  displayPlayers: { id: string; username: string; avatar: string; isReady: boolean; isConnected: boolean; ping: number }[];
  /** Notification when new player joins */
  newPlayerNotification: string | null;
  /** Clear the notification */
  clearNotification: () => void;
}

// No-op functions - defined outside component to avoid recreation
const noop = () => {};
const noopDragMove = (_card: Card, _position: { x: number; y: number }) => {};
const noopDragStart = (_card: Card, _source: 'hand' | 'table' | 'captured', _position: { x: number; y: number }) => {};
const noopDragEnd = (_card: Card, _position: { x: number; y: number }, _outcome: 'success' | 'miss' | 'cancelled', _targetType?: string, _targetId?: string) => {};

export function useOnlinePlayConnection(options: UseOnlinePlayConnectionOptions): UseOnlinePlayConnectionResult {
  const { mode, roomCode } = options;
  const isPrivateRoom = !!roomCode;

  // NOTE: All hooks must be called unconditionally to follow React rules.
  // We call both paths and select which values to use based on isPrivateRoom.

  // ── Private Room Path ─────────────────────────────────────────────────────
  // Pass the actual game mode (e.g., 'three-hands') not 'private'
  // Also pass the roomCode so the socket skips auto-joining matchmaking queues
  const roomSocket = useSocketConnection({ mode, roomCode });
  const room = useRoom(roomSocket?.socket ?? null);
  const roomGameSync = useGameStateSync(roomSocket?.socket ?? null);

  // ── Matchmaking Path ──────────────────────────────────────────────────────
  const multiplayerResult = useMultiplayerGame({ mode });

  // ── Select active values based on connection type ─────────────────────────
  const gameState = isPrivateRoom 
    ? (roomGameSync?.gameState ?? null) 
    : (multiplayerResult?.gameState ?? null);
    
  const gameOverData = multiplayerResult?.gameOverData ?? null;
    
  const playerNumber = isPrivateRoom 
    ? (roomGameSync?.playerNumber ?? 0) 
    : (multiplayerResult?.playerNumber ?? 0);
    
  const isConnected = isPrivateRoom 
    ? (roomSocket?.isConnected ?? false) 
    : (multiplayerResult?.isConnected ?? false);
    
  const playersInLobby = isPrivateRoom 
    ? (room?.room.playerCount ?? 0) 
    : (multiplayerResult?.lobbyPlayers?.length ?? 0);
    
  const sendAction = isPrivateRoom
    ? (roomGameSync?.sendAction ?? noop)
    : (multiplayerResult?.sendAction ?? noop);
    
  const playerDisconnected = isPrivateRoom 
    ? false 
    : (multiplayerResult?.playerDisconnected ?? false);
    
  const error = isPrivateRoom 
    ? null 
    : (multiplayerResult?.error ?? null);
    
  const clearError = isPrivateRoom 
    ? noop 
    : (multiplayerResult?.clearError ?? noop);
    
  const startNextRound = isPrivateRoom 
    ? noop 
    : (multiplayerResult?.startNextRound ?? noop);
    
  const requestSync = isPrivateRoom 
    ? (roomGameSync?.requestSync ?? noop)
    : (multiplayerResult?.requestSync ?? noop);
    
  const opponentDrag = isPrivateRoom 
    ? null 
    : (multiplayerResult?.opponentDrag ?? null);
    
  const emitDragStart = isPrivateRoom 
    ? noopDragStart 
    : (multiplayerResult?.emitDragStart ?? noopDragStart);
    
  const emitDragMove = isPrivateRoom 
    ? noopDragMove 
    : (multiplayerResult?.emitDragMove ?? noopDragMove);
    
  const emitDragEnd = isPrivateRoom 
    ? noopDragEnd 
    : (multiplayerResult?.emitDragEnd ?? noopDragEnd);
    
  const resolvedRoomCode = isPrivateRoom 
    ? (room?.room.roomCode ?? null)
    : (multiplayerResult?.roomCode ?? null);
    
  const roomStatus = isPrivateRoom 
    ? (room?.room.status ?? null)
    : null;

  // Navigate to game when private room game starts
  useEffect(() => {
    if (isPrivateRoom && room?.room.status === 'started' && roomGameSync?.gameState) {
      // Game started - component will handle transition
    }
  }, [isPrivateRoom, room?.room.status, roomGameSync?.gameState]);

  const lobbyPlayers = isPrivateRoom
    ? [] // Private rooms don't use matchmaking lobby players
    : (multiplayerResult?.lobbyPlayers ?? []);

  const displayPlayers = isPrivateRoom
    ? []
    : (multiplayerResult?.displayPlayers ?? []);

  const newPlayerNotification = isPrivateRoom
    ? null
    : (multiplayerResult?.newPlayerNotification ?? null);

  const clearNotification = isPrivateRoom
    ? noop
    : (multiplayerResult?.clearNotification ?? noop);

  // Game ready state for multiplayer
  const gameReady = isPrivateRoom
    ? (roomGameSync?.gameReady ?? false)
    : (multiplayerResult?.gameReady ?? false);

  const allClientsReady = isPrivateRoom
    ? (roomGameSync?.allClientsReady ?? false)
    : (multiplayerResult?.allClientsReady ?? false);

  return useMemo(() => ({
    gameState,
    gameOverData,
    playerNumber,
    isConnected,
    playersInLobby,
    playerDisconnected,
    error,
    gameReady,
    allClientsReady,
    sendAction,
    requestSync,
    clearError,
    startNextRound,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
    roomCode: resolvedRoomCode,
    roomStatus,
    isPrivateRoom,
    lobbyPlayers,
    displayPlayers,
    newPlayerNotification,
    clearNotification,
  }), [
    gameState,
    gameOverData,
    playerNumber,
    isConnected,
    playersInLobby,
    playerDisconnected,
    error,
    gameReady,
    allClientsReady,
    sendAction,
    requestSync,
    clearError,
    startNextRound,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
    resolvedRoomCode,
    roomStatus,
    isPrivateRoom,
    lobbyPlayers,
    displayPlayers,
    newPlayerNotification,
    clearNotification,
  ]);
}

export default useOnlinePlayConnection;