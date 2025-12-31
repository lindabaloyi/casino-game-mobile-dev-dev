/**
 * Hand Card Drag Handler
 * Handles hand card drag operations: contact detection, action determination, trail fallback
 */

import { useCallback } from 'react';
import { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActionFromContact } from '../../src/utils/contactActions';
import { findContactAtPoint } from '../../src/utils/contactDetection';
import { createLogger } from '../../src/utils/debugConfig';

const logger = createLogger('[HAND-DRAG]');

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
    logger.info(`Hand card drag end: ${draggedItem.card.rank}${draggedItem.card.suit}`);

    if (!isMyTurn) {
      logger.warn('Not your turn - blocking drag');
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return;
    }

    // Track card for reset
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Find contact at drop position (80px threshold)
    logger.info(`Checking contact at position: (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (contact) {
      logger.info(`✅ Found contact: ${contact.id} (${contact.type}) at ${contact.distance.toFixed(1)}px`);

      // Determine action from contact
      const action = determineActionFromContact(
        draggedItem.card,
        contact,
        gameState,
        playerNumber
      );

      if (action) {
        logger.info(`📤 Sending action: ${action.type}`, action.payload);
        sendAction(action);
        return;
      } else {
        logger.warn('❌ No valid action determined from contact - this should not happen for builds!');
        logger.warn('Contact details:', contact);
      }
    } else {
      logger.warn('❌ No contact found at drop position - falling back to trail');
      logger.warn('Drop position:', dropPosition);
      logger.warn('This is the BUG - build contact should have been detected!');
    }

    // No contact or invalid action = trail
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
