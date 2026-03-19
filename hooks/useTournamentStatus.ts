/**
 * useTournamentStatus
 * Hook to check tournament status for the current player.
 * NOTE: This hook now accepts gameState as a parameter to avoid creating
 * duplicate socket connections. Pass gameState from the parent component.
 */

import { useMemo } from 'react';
import type { GameState } from './useMultiplayerGame';

interface TournamentStatus {
  isInTournament: boolean;
  isSpectator: boolean;
  isEliminated: boolean;
  isWinner: boolean;
  playerStatus: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' | null;
  tournamentPhase: string | null;
  tournamentRound: number;
  finalShowdownHandsPlayed: number;
  eliminationOrder: number[];
  tournamentScores: { [playerIndex: string]: number };
  playerStatuses: { [playerIndex: string]: string };
}

export interface UseTournamentStatusOptions {
  /** The game state from the parent component's useMultiplayerGame hook */
  gameState: GameState | null;
  playerIndex: number;
}

export function useTournamentStatus(options: UseTournamentStatusOptions): TournamentStatus;
export function useTournamentStatus(gameState: GameState | null, playerIndex: number): TournamentStatus;
export function useTournamentStatus(
  gameStateOrOptions: GameState | null | UseTournamentStatusOptions,
  playerIndex?: number
): TournamentStatus {
  // Handle both call signatures
  let gameState: GameState | null;
  let index: number;
  
  if (gameStateOrOptions && 'gameState' in gameStateOrOptions) {
    // Called with options object: useTournamentStatus({ gameState, playerIndex })
    gameState = gameStateOrOptions.gameState;
    index = gameStateOrOptions.playerIndex;
  } else {
    // Called with positional args: useTournamentStatus(gameState, playerIndex)
    gameState = gameStateOrOptions as GameState | null;
    index = playerIndex ?? 0;
  }
  
  return useMemo(() => {
    const tournamentMode = gameState?.tournamentMode;
    const tournamentPhase = gameState?.tournamentPhase || null;
    const playerStatuses = gameState?.playerStatuses || {};
    const tournamentRound = gameState?.tournamentRound || 1;
    const finalShowdownHandsPlayed = gameState?.finalShowdownHandsPlayed || 0;
    const eliminationOrder = gameState?.eliminationOrder || [];
    const tournamentScores = gameState?.tournamentScores || {};
    
    const isInTournament = tournamentMode === 'knockout' && tournamentPhase !== null;
    
    const playerStatus = playerStatuses[index] 
      ? playerStatuses[index] as 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER'
      : null;
    
    const isSpectator = isInTournament && 
      (playerStatus === 'SPECTATOR' || playerStatus === 'ELIMINATED');
    
    const isEliminated = isInTournament && playerStatus === 'ELIMINATED';
    
    const isWinner = isInTournament && playerStatus === 'WINNER';
    
    return {
      isInTournament,
      isSpectator,
      isEliminated,
      isWinner,
      playerStatus,
      tournamentPhase,
      tournamentRound,
      finalShowdownHandsPlayed,
      eliminationOrder,
      tournamentScores,
      playerStatuses,
    };
  }, [
    gameState,
    index,
  ]);
}

export default useTournamentStatus;
