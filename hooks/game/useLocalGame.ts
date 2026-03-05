/**
 * useLocalGame
 * Hook for client-side (CPU) game state management.
 * 
 * Uses the shared game module for game logic:
 * - ActionRouter for action execution
 * - GameState for state initialization
 * - All action handlers
 * 
 * This is independent from multiplayer - no socket connection needed.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

// Import from shared game module
// The shared module is in JavaScript (CommonJS) but Metro bundler handles this
const { createActionRouter } = require('../../shared/game/ActionRouter');
const { initializeGame, initializeTestGame } = require('../../shared/game/GameState');
const actionHandlers = require('../../shared/game/actions');

// Types matching the server game state
export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameState {
  deck: Card[];
  players: {
    id: number;
    name: string;
    hand: Card[];
    captures: Card[];
    score: number;
    team?: 'A' | 'B';
  }[];
  tableCards: Card[];
  currentPlayer: number;
  round: number;
  scores: number[];
  teamScores: [number, number]; // [Team A, Team B]
  playerCount: number; // 2 or 4
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
  roundEndReason?: 'cards_depleted' | 'max_moves' | 'all_cards_played';
  // Extended state for temp/build stacks (handled by actions)
  tempStacks?: any[];
  buildStacks?: any[];
  pendingExtensions?: any[];
  stackCounters?: { [key: string]: number };
}

interface UseLocalGameResult {
  /** Full game state */
  gameState: GameState;
  /** Send any game action to be executed locally */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Which player this client is (always 0 for human in CPU mode) */
  playerNumber: number;
  /** Whether it's the CPU's turn */
  isCpuTurn: boolean;
  /** Reset the game to initial state */
  resetGame: () => void;
  /** Start a new round */
  startNextRound: () => void;
}

// Constants
const HUMAN_PLAYER = 0;
const CPU_PLAYER = 1;

/**
 * Create a new local game.
 * This initializes the game state with dealt cards.
 * @param {number} playerCount - Number of players (2 or 4)
 */
function createInitialGameState(playerCount: number = 2): GameState {
  return initializeGame(playerCount);
}

/**
 * Hook for managing local game state (CPU mode or Party mode)
 * @param {number} playerCount - Number of players (2 for CPU mode, 4 for Party mode)
 */
export function useLocalGame(playerCount: number = 2): UseLocalGameResult {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(playerCount));
  
  // Create ActionRouter with all shared handlers
  const actionRouter = useMemo(() => {
    return createActionRouter({
      handlers: actionHandlers,
    });
  }, []);
  
  // Execute an action locally
  const sendAction = useCallback((action: { type: string; payload?: Record<string, unknown> }) => {
    const { type, payload } = action;
    const playerIndex = gameState.currentPlayer;
    
    try {
      // Use the shared ActionRouter to execute the action
      const newState = actionRouter.executeAction(
        gameState,
        playerIndex,
        type,
        payload || {}
      );
      
      console.log(`[useLocalGame] Executed action: ${type} by player ${playerIndex}`);
      setGameState(newState);
    } catch (error) {
      console.error(`[useLocalGame] Action failed: ${type}`, error);
      // Don't update state on error - let the error propagate
    }
  }, [gameState, actionRouter]);
  
  // Reset game to initial state
  const resetGame = useCallback(() => {
    setGameState(createInitialGameState(playerCount));
  }, [playerCount]);
  
  // Start next round
  const startNextRound = useCallback(() => {
    // Keep scores and teamScores but reset round-specific state
    setGameState(prev => {
      const newState = createInitialGameState(playerCount);
      return {
        ...newState,
        scores: prev.scores,
        teamScores: prev.teamScores || [0, 0],
        round: prev.round + 1,
      };
    });
  }, [playerCount]);
  
  // Computed values
  const isCpuTurn = gameState.currentPlayer === CPU_PLAYER && !gameState.gameOver;
  
  return {
    gameState,
    sendAction,
    playerNumber: HUMAN_PLAYER,
    isCpuTurn,
    resetGame,
    startNextRound,
  };
}

export default useLocalGame;
