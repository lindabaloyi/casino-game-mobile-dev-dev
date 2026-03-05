/**
 * useCpuEngine
 * Hook for CPU AI decision making.
 * 
 * Monitors when it's CPU's turn and automatically executes moves.
 * Uses the SmartRouter to find valid actions.
 */

import { useEffect, useRef, useCallback } from 'react';
import { GameState } from './useLocalGame';

// Import SmartRouter from shared module
const SmartRouter = require('../../shared/game/smart-router');

const CPU_PLAYER = 1;

// Delay before CPU makes a move (in milliseconds)
// This gives the player time to see that it's CPU's turn
const CPU_THINK_DELAY = 1500;

interface UseCpuEngineOptions {
  /** Current game state */
  gameState: GameState;
  /** Function to execute an action */
  executeAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Whether the CPU engine is enabled */
  enabled?: boolean;
}

/**
 * Hook for CPU AI
 * 
 * When it's CPU's turn:
 * 1. Wait for the thinking delay
 * 2. Find valid actions using SmartRouter
 * 3. Execute the best action (first valid one)
 * 4. Turn ends automatically (handled by action handlers)
 */
export function useCpuEngine({ gameState, executeAction, enabled = true }: UseCpuEngineOptions) {
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Check if it's CPU's turn and trigger AI
  useEffect(() => {
    if (!enabled) return;
    
    // Don't process if game is over or not CPU's turn
    if (gameState.gameOver || gameState.currentPlayer !== CPU_PLAYER) {
      return;
    }
    
    // Don't process if already processing a turn
    if (isProcessingRef.current) {
      return;
    }
    
    console.log('[useCpuEngine] CPU turn detected, preparing move...');
    isProcessingRef.current = true;
    
    // Set timeout for "thinking" delay
    timeoutRef.current = setTimeout(() => {
      try {
        // Find the best action for CPU
        const action = findCpuAction(gameState, CPU_PLAYER);
        
        if (action) {
          console.log(`[useCpuEngine] CPU executing: ${action.type}`, action.payload);
          executeAction(action);
        } else {
          // No valid actions found - end turn
          console.log('[useCpuEngine] No valid actions, ending turn');
          executeAction({ type: 'endTurn', payload: {} });
        }
      } catch (error) {
        console.error('[useCpuEngine] Error during CPU move:', error);
        // On error, try to end turn
        try {
          executeAction({ type: 'endTurn', payload: {} });
        } catch (e) {
          console.error('[useCpuEngine] Failed to end turn:', e);
        }
      } finally {
        isProcessingRef.current = false;
      }
    }, CPU_THINK_DELAY);
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [gameState.currentPlayer, gameState.gameOver, gameState, enabled, executeAction]);
  
  return {
    /** Whether CPU is currently "thinking" */
    isThinking: isProcessingRef.current,
  };
}

/**
 * Find the best action for the CPU to take.
 * 
 * This uses the SmartRouter to determine valid actions.
 * For simplicity, we try each action type and use the first one that works.
 */
function findCpuAction(state: GameState, playerIndex: number): { type: string; payload?: Record<string, unknown> } | null {
  const smartRouter = new SmartRouter();
  
  // Get CPU's hand
  const cpuHand = state.players?.[playerIndex]?.hand || [];
  
  // If CPU has no cards, end turn
  if (cpuHand.length === 0) {
    return { type: 'endTurn', payload: {} };
  }
  
  // Try each card in hand to find valid actions
  for (const card of cpuHand) {
    // Try trail (always valid if card in hand)
    try {
      const trailResult = smartRouter.route('trail', { card }, state, playerIndex);
      if (trailResult.type) {
        return { type: 'trail', payload: { card } };
      }
    } catch (e) {
      // Trail not valid, continue
    }
    
    // Try capture on loose table cards
    for (const tableCard of (state.tableCards || [])) {
      try {
        const captureResult = smartRouter.route(
          'capture',
          { card, targetType: 'loose', targetRank: tableCard.rank, targetSuit: tableCard.suit },
          state,
          playerIndex
        );
        if (captureResult.type) {
          return {
            type: 'capture',
            payload: { card, targetType: 'loose', targetRank: tableCard.rank, targetSuit: tableCard.suit }
          };
        }
      } catch (e) {
        // Capture not valid, continue
      }
    }
    
    // Try createTemp on table cards
    for (const tableCard of (state.tableCards || [])) {
      try {
        const tempResult = smartRouter.route(
          'createTemp',
          { card, targetCard: tableCard },
          state,
          playerIndex
        );
        if (tempResult.type) {
          return { type: 'createTemp', payload: { card, targetCard: tableCard } };
        }
      } catch (e) {
        // Not valid, continue
      }
    }
  }
  
  // If no specific action found, try trail as fallback
  // Trail should always be valid if CPU has cards
  const firstCard = cpuHand[0];
  if (firstCard) {
    return { type: 'trail', payload: { card: firstCard } };
  }
  
  // Last resort: end turn
  return { type: 'endTurn', payload: {} };
}

export default useCpuEngine;
