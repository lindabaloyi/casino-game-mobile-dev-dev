/**
 * useLobbyState
 * 
 * Manages lobby-specific state: ready status for both player and opponent.
 * Provides toggle functionality for ready state.
 * 
 * Currently uses mock opponent for demo - can be extended to use real socket events.
 */

import { useState, useCallback } from 'react';

export interface UseLobbyStateResult {
  /** Whether the local player is ready */
  isReady: boolean;
  /** Whether the opponent is ready */
  opponentReady: boolean;
  /** Toggle ready status */
  toggleReady: () => void;
  /** Reset lobby state */
  reset: () => void;
}

export function useLobbyState(): UseLobbyStateResult {
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  const toggleReady = useCallback(() => {
    setIsReady(prev => !prev);
    // Simulate opponent ready after a delay for demo
    if (!opponentReady) {
      setTimeout(() => setOpponentReady(true), 2000);
    }
  }, [opponentReady]);

  const reset = useCallback(() => {
    setIsReady(false);
    setOpponentReady(false);
  }, []);

  return {
    isReady,
    opponentReady,
    toggleReady,
    reset,
  };
}

export default useLobbyState;
