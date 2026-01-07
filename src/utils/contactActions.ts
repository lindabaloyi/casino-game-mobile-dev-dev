/**
 * Determine game action based on contact between cards
 * Uses rule engine for complex decisions, falls back to handlers for simple cases
 */

import type { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActions } from '../../multiplayer/server/game/logic/actionDetermination';
import { handleBuildContact, handleLooseCardContact, handleTempStackContact } from './contactHandlers';

/**
 * Determine the appropriate action based on card contact
 * Uses rule engine for complex cases, handlers for simple routing
 */
export function determineActionFromContact(
  draggedCard: Card,
  touchedContact: {
    id: string;
    type: string;
    distance: number;
    data?: any;
  },
  gameState: GameState,
  currentPlayer: number,
  source?: string
): { type: string; payload: any } | null {

  console.log('[CONTACT-ACTIONS] 🎯 Determining action from contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    touchedId: touchedContact.id,
    touchedType: touchedContact.type,
    currentPlayer
  });

  // For complex cases that might have multiple options, use the rule engine
  if (touchedContact.type === 'build' || touchedContact.type === 'temporary_stack') {
    console.log('[CONTACT-ACTIONS] 🔀 Using rule engine for complex contact type:', touchedContact.type);

    // Prepare context for rule engine
    const draggedItem = {
      card: draggedCard,
      source: source || 'hand'
    };

    const targetInfo = {
      type: touchedContact.type,
      card: touchedContact.data ? { ...touchedContact.data, type: touchedContact.type } : touchedContact,
      index: touchedContact.data?.index
    };

    try {
      const result = determineActions(draggedItem, targetInfo, gameState);

      console.log('[CONTACT-ACTIONS] 📊 Rule engine result:', {
        actionsCount: result.actions.length,
        requiresModal: result.requiresModal,
        hasDataPackets: result.dataPackets.length > 0
      });

      // If rule engine finds multiple actions or requires modal, return null
      // The frontend should handle this by calling determineActions directly
      const dataPacketsLength = result.dataPackets ? result.dataPackets.length : 0;
      if (result.actions.length > 1 || result.requiresModal || dataPacketsLength > 0) {
        console.log('[CONTACT-ACTIONS] 🎯 Multiple actions/options detected - frontend should show modal');
        return null; // Signal to frontend that modal is needed
      }

      // If rule engine finds exactly one action, return it
      if (result.actions.length === 1) {
        console.log('[CONTACT-ACTIONS] ✅ Single action determined by rules:', result.actions[0].type);
        return result.actions[0];
      }

      // No actions found, fall back to handlers
      console.log('[CONTACT-ACTIONS] ⚠️ No actions from rule engine, falling back to handlers');

    } catch (error) {
      console.error('[CONTACT-ACTIONS] ❌ Error in rule engine:', error);
      console.log('[CONTACT-ACTIONS] ⚠️ Falling back to handlers due to error');
    }
  }

  // Fall back to specific handlers for simple cases or when rule engine fails
  console.log('[CONTACT-ACTIONS] 🔄 Using contact handlers for:', touchedContact.type);

  switch (touchedContact.type) {
    case 'temporary_stack':
    case 'tempStack':
      return handleTempStackContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    case 'build':
      return handleBuildContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    case 'card':
      return handleLooseCardContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    default:
      console.log('[CONTACT-ACTIONS] ❌ Unknown contact type:', touchedContact.type);
      return null;
  }
}
