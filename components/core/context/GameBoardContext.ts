/**
 * GameBoardContext
 * Provides game state and actions to all child components.
 */

import { createContext, useContext } from 'react';
import { GameState } from '../../../hooks/useGameState';

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameBoardContextValue {
  gameState: GameState;
  playerNumber: number;
  isMyTurn: boolean;
  myHand: Card[];
  table: any[];
  playerCaptures: Card[];
  opponentCaptures: Card[];
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
}

export const GameBoardContext = createContext<GameBoardContextValue | null>(null);

export const useGameBoard = (): GameBoardContextValue => {
  const ctx = useContext(GameBoardContext);
  if (!ctx) {
    throw new Error('useGameBoard must be used within GameBoardProvider');
  }
  return ctx;
};
