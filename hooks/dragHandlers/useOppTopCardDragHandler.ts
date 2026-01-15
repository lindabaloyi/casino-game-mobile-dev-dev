/**
 * Opponent Top Card Drag Handler
 * Clean, simple implementation for opponent card dragging
 */

import { useCallback, useState } from 'react';
import { GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActionFromContact } from '../../src/utils/contactActions';
import { findContactAtPoint } from '../../src/utils/contactDetection';

interface OppTopCardDragHandlerProps {
  gameState: GameState;
  playerNumber: number;
  isMyTurn: boolean;
  sendAction: (action: any) => void;
  handleDragStart: (card: any) => void;
}

/**
 * Hook for handling opponent top card drag operations
 */
export function useOppTopCardDragHandler({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  handleDragStart
}: OppTopCardDragHandlerProps) {

  // Store opponent metadata during drag
  const [currentDragMetadata, setCurrentDragMetadata] = useState<any>(null);

  /**
   * Handle opponent top card drag start
   */
  const handleOppTopCardDragStart = useCallback((card: any, metadata: any = {}) => {
    setCurrentDragMetadata(metadata);
    handleDragStart(card);
  }, [handleDragStart]);

  /**
   * Handle opponent top card drag end - ROBUST CENTRALIZED SYSTEM
   */
  const handleOppTopCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    // Find contact using contact detection system
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (!contact) {
      return { validContact: false };
    }
    const opponentId = currentDragMetadata?.opponentId;
    // 🎯 USE ROBUST CENTRALIZED SYSTEM - Same as hand cards
    const action = determineActionFromContact(draggedItem.card, contact, gameState, playerNumber, 'oppTopCard');

    if (action) {
      // Add opponentId to action payload for server processing
      if (!action.payload) action.payload = {};
      action.payload.opponentId = opponentId;

      console.log('[✅ OPP-ACTION] Sending determined action:', {
        type: action.type,
        payload: action.payload,
        timestamp: new Date().toISOString()
      });

      sendAction(action);
      return { validContact: true };
    }
    return { validContact: false };

  }, [sendAction, gameState, playerNumber, currentDragMetadata]);

  return {
    handleOppTopCardDragStart,
    handleOppTopCardDragEnd
  };
}
