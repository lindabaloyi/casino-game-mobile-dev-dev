/**
 * useTournamentStatus
 * Hook to check tournament status for the current player.
 * NOTE: This hook now accepts gameState as a parameter to avoid creating
 * duplicate socket connections. Pass gameState from the parent component.
 */

import { useMemo } from 'react';
import type { GameState } from './useGameSession';

interface QualificationScore {
  totalPoints: number;
  cardPoints: number;
  tenDiamondPoints: number;
  twoSpadePoints: number;
  acePoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  rank?: number;
}

interface TournamentStatus {
  isInTournament: boolean;
  isSpectator: boolean;
  isEliminated: boolean;
  isWinner: boolean;
  isInQualificationReview: boolean;
  playerStatus: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' | null;
  tournamentPhase: string | null;
  tournamentRound: number;
  finalShowdownHandsPlayed: number;
  eliminationOrder: string[];  // Now uses playerId strings!
  tournamentScores: { [playerId: string]: number };
  playerStatuses: { [playerId: string]: string };
  qualificationCountdown: number;
  qualifiedPlayers: string[];  // Now uses playerId strings!
  qualificationScores: { [playerId: string]: QualificationScore };
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
    // FIXED: Handle null playerIndex for eliminated players
    index = playerIndex ?? -1;
  }
  
  return useMemo(() => {
    const tournamentMode = gameState?.tournamentMode;
    const tournamentPhase = gameState?.tournamentPhase || null;
    const playerStatuses = gameState?.playerStatuses || {};
    const tournamentRound = gameState?.tournamentRound || 1;
    const finalShowdownHandsPlayed = gameState?.finalShowdownHandsPlayed || 0;
    const eliminationOrder = (gameState?.eliminationOrder || []) as string[];
    const tournamentScores = gameState?.tournamentScores || {};
    const qualifiedPlayers = (gameState?.qualifiedPlayers || []) as string[];
    
    const isInTournament = tournamentMode === 'knockout' && tournamentPhase !== null;
    
    // FIXED: Handle null playerIndex for ELIMINATED players
    let myPlayerId: string | null = null;
    if (index >= 0 && gameState?.players && gameState.players[index]) {
      // Get playerId from players array - it's stored as string (e.g., 'player_0')
      myPlayerId = String(gameState.players[index].id);
    }
    
    // Look up status using playerId
    const playerStatus = myPlayerId && playerStatuses[myPlayerId] 
      ? playerStatuses[myPlayerId] as 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER'
      : null;
    
    const isSpectator = isInTournament && 
      (playerStatus === 'SPECTATOR' || playerStatus === 'ELIMINATED');
    
    const isEliminated = isInTournament && playerStatus === 'ELIMINATED';
    
    const isWinner = isInTournament && playerStatus === 'WINNER';
    
    // Qualification review data
    const isInQualificationReview = tournamentPhase === 'QUALIFICATION_REVIEW';
    const qualificationCountdown = gameState?.qualificationCountdown || 0;
    const qualificationScores = gameState?.qualificationScores || {};
    
    return {
      isInTournament,
      isSpectator,
      isEliminated,
      isWinner,
      isInQualificationReview,
      playerStatus,
      tournamentPhase,
      tournamentRound,
      finalShowdownHandsPlayed,
      eliminationOrder,
      tournamentScores,
      playerStatuses,
      qualificationCountdown,
      qualifiedPlayers,
      qualificationScores,
    };
  }, [
    gameState,
    index,
  ]);
}

export default useTournamentStatus;
