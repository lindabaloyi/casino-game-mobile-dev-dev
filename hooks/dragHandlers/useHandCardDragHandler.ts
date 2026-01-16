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

    // 🎯 COMPREHENSIVE TURN STATE DEBUGGING
    const turnState = {
      isMyTurn,
      gameState_currentPlayer: gameState.currentPlayer,
      playerNumber,
      playerHandSize: gameState.playerHands[playerNumber]?.length || 0,
      opponentHandSize: gameState.playerHands[(playerNumber + 1) % 2]?.length || 0,
      gameRound: gameState.round,
      timestamp: new Date().toISOString()
    };

    console.log('🎯 TURN_STATE_DEBUG at drag end:', turnState);
    logger.info('Turn state debug', turnState);

    if (!isMyTurn) {
      console.error('🚨 TURN_VIOLATION_DETECTED:', {
        ...turnState,
        attemptedAction: 'trail',
        reason: 'Client attempted action when not player turn'
      });
      logger.error('Not your turn - blocking drag', turnState);
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

    logger.info(`Contact detection result:`, {
      contactFound: !!contact,
      contactId: contact?.id,
      contactType: contact?.type,
      contactDistance: contact?.distance?.toFixed(1),
      dropPosition: `${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)}`
    });

    if (contact) {
      logger.info(`✅ Found contact: ${contact.id} (${contact.type}) at ${contact.distance.toFixed(1)}px`);

      // 🎯 CONTACT DETERMINATION: Use rule engine and contact handlers for all interactions

      // Determine action from contact (for other cases: captures, own builds, etc.)
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

        // For capture actions, return false so card resets to hand immediately
        // For other actions (like temp stack additions and build additions), keep cardToReset set and wait for server confirmation
        const shouldResetImmediately = action.type === 'capture';
        const validContact = !shouldResetImmediately;

        // For actions that need server confirmation (like temp stacks), keep cardToReset set
        // The server will send action-failed event if it fails, which will trigger reset
        // If server confirms success, game-update will clear cardToReset
        if (shouldResetImmediately) {
          // Only clear for immediate resets (captures)
          setCardToReset(null);
        }
        // For temp stack actions, leave cardToReset set - server will handle success/failure

        return { validContact };
      } else {
        logger.warn('❌ No valid action determined from contact');
        logger.warn('Contact details:', contact);
        // Continue to trail fallback
      }
    } else {
      logger.info('ℹ️ No contact found - empty table drop, sending trail action');
      logger.info('Drop position:', dropPosition);

      // 🎯 DEFENSIVE TURN VALIDATION: Double-check before sending trail
      if (!isMyTurn) {
        console.error('🚨 DEFENSIVE_TURN_CHECK_FAILED:', {
          isMyTurn,
          gameState_currentPlayer: gameState.currentPlayer,
          playerNumber,
          attemptedAction: 'trail_on_empty_table',
          reason: 'Turn validation failed before sending trail action'
        });
        setErrorModal({ visible: true, title: 'Turn Error', message: 'Cannot trail - not your turn.' });
        return { validContact: false };
      }

      // 🎯 Empty table = Valid trail action (traditional Casino gameplay)
      const clientTurnState = {
        playerNumber,
        expectedCurrentPlayer: gameState.currentPlayer,
        isMyTurn,
        timestamp: new Date().toISOString()
      };

      sendAction({
        type: 'trail',
        payload: {
          card: draggedItem.card,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clientTurnState // Include for server-side validation debugging
        }
      });

      return { validContact: false }; // Card stays on table (trail behavior)
    }

    // Default fallback - should not reach here
    return { validContact: false };

  }, [sendAction, gameState, playerNumber, isMyTurn, setCardToReset, setErrorModal]);

  return {
    handleDragEnd
  };
}
