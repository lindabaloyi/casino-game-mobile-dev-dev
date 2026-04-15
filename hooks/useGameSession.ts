/**
 * useGameSession
 * 
 * Handles game state only - cards, turns, game-start, game-over, actions.
 * No lobby state - use useLobby for that.
 * 
 * Usage:
 *   const game = useGameSession(socket, mode);
 *   const { gameState, playerNumber, sendAction } = game;
 */

import { useSocketConnection, useGameStateSync, useOpponentDrag } from './multiplayer';
import type { Card, GameState, GameOverData, OpponentDragState } from './multiplayer';
import { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { GameMode } from '../utils/modeConfig';

export type { Card, GameState, GameOverData, OpponentDragState };

export interface UseGameSessionOptions {
  mode: GameMode;
}

export interface UseGameSessionResult {
  gameState: GameState | null;
  gameOverData: GameOverData | null;
  playerNumber: number;
  isConnected: boolean;
  isInLobby: boolean;
  playersInLobby: number;
  requiredPlayers: number;
  error: string | null;
  gameReady: boolean;
  allClientsReady: boolean;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  requestSync: () => void;
  clearError: () => void;
  startNextRound: () => void;
  opponentDrag: OpponentDragState | null;
  emitDragStart: (card: Card, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => void;
  emitDragMove: (card: Card, position: { x: number; y: number }) => void;
  emitDragEnd: (card: Card, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
  roomCode: string | null;
  playerDisconnected: boolean;
  opponentDisconnected: boolean;
}

export function getPlayerCount(mode: GameMode): number {
  switch (mode) {
    case 'party':
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

export function useGameSession(socket: Socket | null, mode: GameMode): UseGameSessionResult {
  const playerCount = getPlayerCount(mode);
  const isMultiplayerMode = playerCount > 1;

  const { socket: connectedSocket, isConnected, error: socketError } = useSocketConnection({ mode });
  const actualSocket = socket || connectedSocket;

  const gameSync = useGameStateSync(actualSocket);
  const opponentDrag = useOpponentDrag(actualSocket);

  const startNextRound = useCallback(() => {
    if (isMultiplayerMode) {
      actualSocket?.emit('start-next-round');
    }
  }, [actualSocket, isMultiplayerMode]);

  return {
    gameState: gameSync.gameState,
    gameOverData: gameSync.gameOverData,
    playerNumber: gameSync.playerNumber,
    isConnected,
    isInLobby: !gameSync.gameState && isMultiplayerMode,
    playersInLobby: 0,
    requiredPlayers: playerCount,
    error: socketError || gameSync.error,
    gameReady: gameSync.gameReady,
    allClientsReady: gameSync.allClientsReady,
    sendAction: gameSync.sendAction,
    requestSync: gameSync.requestSync,
    clearError: gameSync.clearError,
    startNextRound,
    opponentDrag: opponentDrag.opponentDrag,
    emitDragStart: opponentDrag.emitDragStart,
    emitDragMove: opponentDrag.emitDragMove,
    emitDragEnd: opponentDrag.emitDragEnd,
    roomCode: null,
    playerDisconnected: false,
    opponentDisconnected: gameSync.opponentDisconnected,
  };
}

export default useGameSession;