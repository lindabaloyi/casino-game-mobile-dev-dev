/**
 * useGameReady
 * 
 * Validates that the local game is fully initialized before navigation.
 * Ensures all cards are dealt and game state is valid.
 * 
 * Responsibilities:
 *  - Validate gameState exists and is valid
 *  - Verify playerNumber is set
 *  - Check that current player has hand cards
 *  - Emit 'client-ready' to server when ready
 *  - Listen for 'all-clients-ready' event
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { GameState } from './useGameStateSync';

export interface UseGameReadyResult {
  /** Whether the local game is fully initialized and ready */
  gameReady: boolean;
  /** Whether all clients have confirmed they're ready */
  allClientsReady: boolean;
  /** Validate if game state is ready for navigation */
  validateGameReady: (gameState: GameState | null, playerNumber: number | null) => boolean;
  /** Emit client-ready event to server */
  emitClientReady: (gameId: number, playerIndex: number) => void;
}

export function useGameReady(socket: Socket | null): UseGameReadyResult {
  const [gameReady, setGameReady] = useState(false);
  const [allClientsReady, setAllClientsReady] = useState(false);
  
  // Track if we've already sent client-ready to avoid duplicates
  const hasSentReadyRef = useRef(false);
  const lastValidatedStateRef = useRef<string | null>(null);

  /**
   * Validate if game state is ready for navigation
   * Returns true only if:
   * 1. gameState exists
   * 2. playerNumber is set
   * 3. Current player has valid hand cards
   * 4. All required game data is present
   */
  const validateGameReady = useCallback((gameState: GameState | null, playerNumber: number | null): boolean => {
    // Check if gameState exists
    if (!gameState) {
      return false;
    }

    // Check if playerNumber is set
    if (playerNumber === null || playerNumber === undefined) {
      return false;
    }

    // Check if players array exists
    if (!gameState.players || !Array.isArray(gameState.players)) {
      return false;
    }

    // Check if current player exists in players array
    const currentPlayer = gameState.players[playerNumber];
    if (!currentPlayer) {
      return false;
    }

    // Check if current player has hand cards
    if (!currentPlayer.hand || !Array.isArray(currentPlayer.hand)) {
      return false;
    }

    // Check if hand has cards (at least 1 card)
    if (currentPlayer.hand.length === 0) {
      return false;
    }

    // Check if tableCards exists
    if (!gameState.tableCards || !Array.isArray(gameState.tableCards)) {
      return false;
    }

    // Create a unique state signature to detect state changes
    const stateSignature = JSON.stringify({
      playerNumber,
      handLength: currentPlayer.hand.length,
      tableCardsLength: gameState.tableCards.length,
      playerCount: gameState.playerCount,
      currentPlayer: gameState.currentPlayer
    });

    // If state changed, reset ready status
    if (lastValidatedStateRef.current !== stateSignature) {
      lastValidatedStateRef.current = stateSignature;
      setGameReady(false);
      hasSentReadyRef.current = false;
    }

    // All checks passed
    // Set gameReady to true
    setGameReady(true);
    return true;
  }, []);

  // Listen for all-clients-ready event from server
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleAllClientsReady = (data: { gameId: number }) => {
      setAllClientsReady(true);
    };

    socket.on('all-clients-ready', handleAllClientsReady);

    return () => {
      socket.off('all-clients-ready', handleAllClientsReady);
    };
  }, [socket]);

  // Export function to emit client-ready event
  const emitClientReady = useCallback((gameId: number, playerIndex: number) => {
    if (!socket || hasSentReadyRef.current) {
      return;
    }

    socket.emit('client-ready', { gameId, playerIndex });
    hasSentReadyRef.current = true;
  }, [socket]);

  // Export emitClientReady for external use
  return {
    gameReady,
    allClientsReady,
    validateGameReady,
    emitClientReady
  };
}

export default useGameReady;