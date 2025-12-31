/**
 * Hand Card Drag Handler
 * Handles hand card drag operations: contact detection, action determination, trail fallback
 */

import { useCallback } from 'react';
import { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActionFromContact } from '../../src/utils/contactActions';
import { findContactAtPoint } from '../../src/utils/contactDetection';

interface HandCardDragHandlerProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: { visible: boolean; title: string; message: string } | null) => void;
  isMyTurn: boolean;
}

/**
 * Hook for handling hand card drag operations
 */
export function useHandCardDragHandler({
  gameState,
  playerNumber,
  sendAction,
  setCardToReset,
  setErrorModal,
  isMyTurn
}: HandCardDragHandlerProps) {

  /**
   * Handle hand card drag end with contact detection
   */
  const handleDragEnd = useCallback((
    draggedItem: { card: Card; source?: string },
    dropPosition: { x: number; y: number }
  ) => {
    console.log(`[HAND-DRAG] 🎯 Hand card drag end:`, {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      dropPosition,
      source: draggedItem.source || 'hand'
    });

    if (!isMyTurn) {
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return;
    }

    // Track card for reset
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Find contact at drop position (80px threshold)
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (contact) {
      console.log(`[HAND-DRAG] ✅ Found contact:`, {
        id: contact.id,
        type: contact.type,
        distance: Math.round(contact.distance)
      });

      // Determine action from contact
      const action = determineActionFromContact(
        draggedItem.card,
        contact,
        gameState,
        playerNumber
      );

      if (action) {
        console.log(`[HAND-DRAG] 🚀 Sending action: ${action.type}`);
        sendAction(action);
        return;
      } else {
        console.log(`[HAND-DRAG] ❌ No valid action determined from contact`);
      }
    } else {
      console.log(`[HAND-DRAG] ❌ No contact found - must be a trail`);
    }

    // No contact or invalid action = trail
    console.log(`[HAND-DRAG] 🛤️ Falling back to trail`);
    sendAction({
      type: 'trail',
      payload: {
        card: draggedItem.card,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

  }, [sendAction, gameState, playerNumber, isMyTurn, setCardToReset, setErrorModal]);

  return {
    handleDragEnd
  };
}
