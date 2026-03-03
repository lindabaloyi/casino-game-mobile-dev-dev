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
  cardsRemaining: [number, number]; // [player1, player2]
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

    const player1Cards = gameState.playerHands?.[0]?.length || 0;
    const player2Cards = gameState.playerHands?.[1]?.length || 0;
    const turnCounter = gameState.turnCounter || 1;

    // Log round state for debugging
    console.log(`[useGameRound] Round ${gameState.round}: turn=${turnCounter}, P1hand=${player1Cards}, P2hand=${player2Cards}`);

    // Round ends when BOTH conditions are met:
    // 1. Both player hands are empty (all cards played)
    // 2. At least one full turn has been completed (turnCounter >= 2)
    const handsEmpty = player1Cards === 0 && player2Cards === 0;
    const hasPlayed = turnCounter >= 2;

    if (handsEmpty && hasPlayed) {
      console.log(`[useGameRound] ✅ Round OVER: both hands empty`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: false,
        isOver: true,
        turnCounter,
        cardsRemaining: [player1Cards, player2Cards],
        endReason: 'all_cards_played',
      });
    } else {
      // Round still active
      console.log(`[useGameRound] Round continues: P1=${player1Cards}, P2=${player2Cards}, turn=${turnCounter}`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: true,
        isOver: false,
        turnCounter,
        cardsRemaining: [player1Cards, player2Cards],
      });
    }
  }, [gameState?.playerHands, gameState?.round, gameState?.turnCounter]);

  return roundInfo;
}

export default useGameRound;
