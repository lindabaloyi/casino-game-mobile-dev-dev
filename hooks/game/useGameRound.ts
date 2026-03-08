/**
 * useGameRound
 * Custom hook for tracking round state and detecting round end.
 * Round ends when ALL player hands are empty (all cards played).
 * 
 * Trick completion is tracked separately via turn flags (turnStarted/turnEnded).
 */

import { useEffect, useState } from 'react';
import { GameState } from '../useGameState';

export interface RoundPlayerTurnStatus {
  turnStarted: boolean;
  turnEnded: boolean;
  actionCompleted: boolean;
}

export interface RoundInfo {
  roundNumber: number;
  isActive: boolean;
  isOver: boolean;
  turnCounter: number;
  cardsRemaining: number[]; // Array of cards per player
  endReason?: 'all_cards_played' | 'max_turns_reached';
  
  // Turn status per player (new)
  playerTurnStatus?: Record<number, RoundPlayerTurnStatus>;
}

export function useGameRound(gameState: GameState | null): RoundInfo {
  const [roundInfo, setRoundInfo] = useState<RoundInfo>(() => ({
    roundNumber: 1,
    isActive: true,
    isOver: false,
    turnCounter: 1,
    cardsRemaining: [0, 0],
  }));

  useEffect(() => {
    if (!gameState) {
      return;
    }
    
    const playerCount = gameState.playerCount || gameState.players?.length || 2;
    const playerHands = gameState.players || [];
    
    // Get cards for each player (works for 2 or 4 players)
    const cardsPerPlayer: number[] = [];
    for (let i = 0; i < playerCount; i++) {
      cardsPerPlayer.push(playerHands[i]?.hand?.length || 0);
    }
    
    const turnCounter = gameState.turnCounter || 1;
    
    // Check for unresolved stacks on table (client-side check)
    const tableCards = gameState.tableCards || [];
    const tempStacks = tableCards.filter((tc: any) => tc.type === 'temp_stack');
    const pendingExtensions = tableCards.filter((tc: any) => 
      tc.type === 'build_stack' && tc.pendingExtension
    );
    const hasUnresolved = tempStacks.length > 0 || pendingExtensions.length > 0;

    // Get turn status per player
    const playerTurnStatus: Record<number, RoundPlayerTurnStatus> = {};
    const roundPlayers = gameState.roundPlayers || {};
    
    for (let i = 0; i < playerCount; i++) {
      const rp = roundPlayers[i];
      playerTurnStatus[i] = {
        turnStarted: rp?.turnStarted || false,
        turnEnded: rp?.turnEnded || false,
        actionCompleted: rp?.actionCompleted || false,
      };
    }

    // Round ends when ALL conditions are met:
    // 1. All player hands are empty (all cards played)
    // 2. At least one full trick has been completed (turnCounter >= playerCount)
    // 3. No unresolved temp stacks or pending extensions
    const allHandsEmpty = cardsPerPlayer.every(cards => cards === 0);
    const hasPlayed = turnCounter >= playerCount;
    
    // Round ends ONLY when all hands are empty (all cards played)
    if (allHandsEmpty && hasPlayed && !hasUnresolved) {
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: false,
        isOver: true,
        turnCounter,
        cardsRemaining: cardsPerPlayer,
        endReason: 'all_cards_played',
        playerTurnStatus,
      });
    } else {
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: true,
        isOver: false,
        turnCounter,
        cardsRemaining: cardsPerPlayer,
        playerTurnStatus,
      });
    }
  }, [gameState?.players, gameState?.round, gameState?.turnCounter, gameState?.roundPlayers]);

  return roundInfo;
}

export default useGameRound;
