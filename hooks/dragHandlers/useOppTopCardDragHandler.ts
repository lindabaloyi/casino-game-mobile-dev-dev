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
    console.log(`[🎯 OPP-DRAG-START] Opponent card drag started:`, {
      card: `${card.rank}${card.suit}`,
      opponentId: metadata.opponentId
    });
    setCurrentDragMetadata(metadata);
    handleDragStart(card);
  }, [handleDragStart]);

  /**
   * Handle opponent top card drag end - ROBUST CENTRALIZED SYSTEM
   */
  const handleOppTopCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[🏁 OPP-DRAG-END] Processing drop at:`, dropPosition);

    // Find contact using contact detection system
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (!contact) {
      console.log('[❌ OPP-DRAG-END] No contact found');
      return { validContact: false };
    }

    const opponentId = currentDragMetadata?.opponentId;
    console.log(`[🎯 OPP-CONTACT] Contact detected:`, {
      type: contact.type,
      opponentId,
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`
    });

    // 🎯 USE ROBUST CENTRALIZED SYSTEM - Same as hand cards
    console.log('[🎯 OPP-DETERMINE-ACTION] Using centralized action determination');
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

    console.log('[⚠️ OPP-NO-ACTION] No valid action determined from contact');
    return { validContact: false };

  }, [sendAction, gameState, playerNumber, currentDragMetadata]);

  return {
    handleOppTopCardDragStart,
    handleOppTopCardDragEnd
  };
}
