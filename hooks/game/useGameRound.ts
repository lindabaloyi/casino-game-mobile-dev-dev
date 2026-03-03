/**
 * useGameRound
 * Custom hook for tracking round state and detecting round end.
 * Round ends when turnCounter >= 20 AND both players have 0 cards.
 */

import { useEffect, useState } from 'react';
import { GameState } from '../useGameState';

export interface RoundInfo {
  roundNumber: number;
  isActive: boolean;
  isOver: boolean;
  turnCounter: number;
  turnsRemaining: number; // turns left in round (21 - turnCounter)
  cardsRemaining: [number, number]; // [player1, player2]
  endReason?: 'all_cards_played';
}

const MAX_TURNS_ROUND_1 = 21; // 20 moves + starts at 1

export function useGameRound(gameState: GameState | null): RoundInfo {
  const [roundInfo, setRoundInfo] = useState<RoundInfo>(() => ({
    roundNumber: 1,
    isActive: true,
    isOver: false,
    turnCounter: 1,
    turnsRemaining: 20,
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
    console.log(`[useGameRound] Round ${gameState.round}: turn=${turnCounter}/19, P1hand=${player1Cards}, P2hand=${player2Cards}`);

    // Round ends when:
    // 1. turnCounter >= 20 (both players played all 10 cards each)
    // 2. Both player hands are empty
    const allCardsPlayed = turnCounter >= MAX_TURNS_ROUND_1;
    const handsEmpty = player1Cards === 0 && player2Cards === 0;

    if (allCardsPlayed && handsEmpty) {
      console.log(`[useGameRound] ✅ Round OVER: all cards played`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: false,
        isOver: true,
        turnCounter,
        turnsRemaining: 0,
        cardsRemaining: [player1Cards, player2Cards],
        endReason: 'all_cards_played',
      });
    } else {
      // Round still active
      const turnsRemaining = Math.max(0, MAX_TURNS_ROUND_1 - turnCounter);
      console.log(`[useGameRound] Round continues: turn ${turnCounter}, P1=${player1Cards}, P2=${player2Cards}`);
      setRoundInfo({
        roundNumber: gameState.round,
        isActive: true,
        isOver: false,
        turnCounter,
        turnsRemaining,
        cardsRemaining: [player1Cards, player2Cards],
      });
    }
  }, [gameState?.playerHands, gameState?.round, gameState?.turnCounter]);

  return roundInfo;
}

export default useGameRound;
