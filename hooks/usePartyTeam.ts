/**
 * usePartyTeam Hook
 * Provides team context for party mode (4-player) games
 * Includes team colors, player tags, and team relationship checks
 */

import { useMemo, useCallback } from 'react';
import { useMultiplayerGame } from './useMultiplayerGame';
import {
  getTeamFromIndex,
  getPlayerPositionLabel,
  getPlayerTag,
  areTeammates,
  getTeamColors as getTeamColorsFromTypes,
  getOppositeTeamColors,
  type TeamId,
  type TeamColors,
} from '../types/game.types';

/**
 * Hook return type with team context information
 */
export interface UsePartyTeamReturn {
  /** Current player's team (null if not in game) */
  currentPlayerTeam: TeamId | null;
  /** Colors for current player's team */
  currentPlayerColors: TeamColors | null;
  /** Whether the game is party mode (4 players) */
  isPartyMode: boolean;
  /** Get team for any player index */
  getTeam: (playerIndex: number) => TeamId;
  /** Get player tag (e.g., "Team A P1") for any player */
  getTag: (playerIndex: number) => string;
  /** Get position label (P1 or P2) for any player */
  getPosition: (playerIndex: number) => 'P1' | 'P2';
  /** Check if a player is on the current player's team */
  isMyTeam: (playerIndex: number) => boolean;
  /** Check if it's a specific player's turn */
  isMyTurn: (playerIndex: number) => boolean;
  /** Get colors for a specific team */
  getTeamColors: (teamId: TeamId) => TeamColors;
  /** Get colors for the opposite team */
  getOppositeColors: (teamId: TeamId) => TeamColors;
}

/**
 * Provides team context for party mode games
 * Use this hook in party mode components to access team information
 */
export function usePartyTeam(): UsePartyTeamReturn {
  const { gameState, playerNumber } = useMultiplayerGame({ mode: 'party' });

  // Get current player from gameState
  const currentPlayerIndex = gameState?.currentPlayer;

  const currentPlayerTeam = useMemo(() => {
    if (currentPlayerIndex === undefined || currentPlayerIndex === null) {
      return null;
    }
    return getTeamFromIndex(currentPlayerIndex);
  }, [currentPlayerIndex]);

  const currentPlayerColors = useMemo(() => {
    if (!currentPlayerTeam) return null;
    return getTeamColorsFromTypes(currentPlayerTeam);
  }, [currentPlayerTeam]);

  const isPartyMode = useMemo(() => {
    return (gameState?.playerCount ?? 0) === 4;
  }, [gameState?.playerCount]);

  const getTeam = useCallback((playerIndex: number): TeamId => {
    return getTeamFromIndex(playerIndex);
  }, []);

  const getTag = useCallback((playerIndex: number): string => {
    return getPlayerTag(playerIndex);
  }, []);

  const getPosition = useCallback((playerIndex: number): 'P1' | 'P2' => {
    return getPlayerPositionLabel(playerIndex);
  }, []);

  const isMyTeam = useCallback((playerIndex: number): boolean => {
    if (currentPlayerIndex === undefined || currentPlayerIndex === null) {
      return false;
    }
    return areTeammates(currentPlayerIndex, playerIndex);
  }, [currentPlayerIndex]);

  const isMyTurn = useCallback((playerIndex: number): boolean => {
    return currentPlayerIndex === playerIndex;
  }, [currentPlayerIndex]);

  const getTeamColors = useCallback((teamId: TeamId): TeamColors => {
    return getTeamColorsFromTypes(teamId);
  }, []);

  const getOppositeColors = useCallback((teamId: TeamId): TeamColors => {
    return getOppositeTeamColors(teamId);
  }, []);

  return {
    currentPlayerTeam,
    currentPlayerColors,
    isPartyMode,
    getTeam,
    getTag,
    getPosition,
    isMyTeam,
    isMyTurn,
    getTeamColors,
    getOppositeColors,
  };
}
