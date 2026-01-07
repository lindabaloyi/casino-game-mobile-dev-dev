/**
 * Hand Card Drag Handler
 * Handles hand card drag operations: contact detection, action determination, trail fallback
 */

import { useCallback } from 'react';
import { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActions } from '../../multiplayer/server/game/logic/actionDetermination';
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
   * Returns whether a valid contact was made (for UI positioning)
   */
  const handleDragEnd = useCallback((
    draggedItem: { card: Card; source?: string },
    dropPosition: { x: number; y: number }
  ): { validContact: boolean } => {
    logger.info(`Hand card drag end: ${draggedItem.card.rank}${draggedItem.card.suit}`);

    if (!isMyTurn) {
      logger.warn('Not your turn - blocking drag');
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return { validContact: false };
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
      let action = determineActionFromContact(
        draggedItem.card,
        contact,
        gameState,
        playerNumber,
        'hand'
      );

      // If contact handler returns null, it means multiple options exist - use rule engine directly
      if (!action && (contact.type === 'build' || contact.type === 'temporary_stack')) {
        logger.info('🎯 Multiple options detected, calling rule engine directly');

        const draggedItemForRules = {
          card: draggedItem.card,
          source: draggedItem.source || 'hand'
        };

        const targetInfoForRules = {
          type: contact.type,
          card: contact.data || contact,
          index: contact.data?.index
        };

        try {
          const ruleResult = determineActions(draggedItemForRules, targetInfoForRules, gameState);

          logger.info(`📊 Rule engine result: ${ruleResult.actions.length} actions, requiresModal: ${ruleResult.requiresModal}`);

          // For now, if multiple actions exist, we'll need modal handling
          // For single actions, use it directly
          if (ruleResult.actions.length === 1 && !ruleResult.requiresModal && ruleResult.dataPackets.length === 0) {
            action = ruleResult.actions[0];
            if (action) {
              logger.info('✅ Using single action from rule engine:', action.type);
            } else {
              logger.error('❌ Rule engine returned null action despite length check');
            }
          } else {
            logger.warn('🎯 Multiple actions/options require modal - not implemented yet');
            // TODO: Implement modal for multiple options
          }
        } catch (error) {
          logger.error('❌ Error calling rule engine:', error);
        }
      }

      if (action) {
        logger.info(`📤 Sending action: ${action.type}`, action.payload);
        sendAction(action);
        return { validContact: true }; // ✅ Valid contact - card should stay
      } else {
        logger.warn('❌ No valid action determined from contact');
        logger.warn('Contact details:', contact);
        // Continue to trail fallback
      }
    } else {
      logger.warn('❌ No contact found at drop position - falling back to trail');
      logger.warn('Drop position:', dropPosition);
      logger.warn('This is the BUG - build contact should have been detected!');
    }

    // No contact or invalid action = trail (card should reset)
    sendAction({
      type: 'trail',
      payload: {
        card: draggedItem.card,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    return { validContact: false }; // ❌ No valid contact - card should reset

  }, [sendAction, gameState, playerNumber, isMyTurn, setCardToReset, setErrorModal]);

  return {
    handleDragEnd
  };
}
