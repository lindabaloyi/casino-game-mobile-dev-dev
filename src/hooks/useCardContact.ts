/**
 * Main hook for the contact-based card interaction system
 */

import { useCallback } from 'react';
import type { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActionFromContact } from '../utils/contactActions';
import {
    clearAllPositions,
    ContactPosition,
    findContactAtPoint,
    removePosition,
    reportPosition
} from '../utils/contactDetection';

/**
 * Hook for contact-based card interactions
 */
export function useCardContact() {
  /**
   * Report a card's position to the contact system
   */
  const reportCardPosition = useCallback((id: string, position: ContactPosition) => {
    reportPosition(id, position);
  }, []);

  /**
   * Remove a card's position from the contact system
   */
  const removeCardPosition = useCallback((id: string) => {
    removePosition(id);
  }, []);

  /**
   * Find contact at a point
   */
  const findContact = useCallback((x: number, y: number, threshold?: number) => {
    return findContactAtPoint(x, y, threshold);
  }, []);

  /**
   * Determine action from contact
   */
  const determineAction = useCallback((
    draggedCard: Card,
    contact: { id: string; type: string; distance: number; data?: any },
    gameState: GameState,
    currentPlayer: number
  ) => {
    return determineActionFromContact(draggedCard, contact, gameState, currentPlayer);
  }, []);

  /**
   * Clear all positions (for cleanup)
   */
  const clearPositions = useCallback(() => {
    clearAllPositions();
  }, []);

  return {
    reportCardPosition,
    removeCardPosition,
    findContact,
    determineAction,
    clearPositions
  };
}
