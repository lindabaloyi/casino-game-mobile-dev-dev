/**
 * useGameRound
 * Custom hook for tracking round state and detecting round end.
 * Round ends when BOTH player hands are empty (cards played).
 */

import { useEffect, useState } from 'react';
import { GameState } from '../useGameState';

export interface RoundInfo {
  roundNumber: number;
  isActive: boolean;
  isOver: boolean;
  turnCounter: number;
  cardsRemaining: number[]; // Array of cards per player
  endReason?: 'all_cards_played';
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

    // Log round state for debugging
    console.log(`[useGameRound] Round ${gameState.round}: turn=${turnCounter}, ${playerCount} players, cardsPerPlayer=${cardsPerPlayer.join(',')}`);

    // Round ends when ALL conditions are met:
    // 1. All player hands are empty
    // 2. At least one full turn has been completed (turnCounter >= 2)
    const allHandsEmpty = cardsPerPlayer.every(cards => cards === 0);
    const hasPlayed = turnCounter >= 2;

    if (allHandsEmpty && hasPlayed) {
      console.log(`[useGameRound] ✅ Round OVER: all hands empty`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: false,
        isOver: true,
        turnCounter,
        cardsRemaining: cardsPerPlayer,
        endReason: 'all_cards_played',
      });
    } else {
      // Round still active
      console.log(`[useGameRound] Round continues: cardsPerPlayer=${cardsPerPlayer.join(',')}, turn=${turnCounter}`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: true,
        isOver: false,
        turnCounter,
        cardsRemaining: cardsPerPlayer,
      });
    }
  }, [gameState?.players, gameState?.round, gameState?.turnCounter]);

  return roundInfo;
}

export default useGameRound;
