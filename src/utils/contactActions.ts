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
  // For complex cases that might have multiple options, use the rule engine
  if (touchedContact.type === 'build' || touchedContact.type === 'temporary_stack' || touchedContact.type === 'tempStack') {
    // Prepare context for rule engine
    const draggedItem = {
      card: draggedCard,
      source: source || 'hand'
    };

    // CRITICAL FIX: Properly preserve all temp stack build values for rule engine
    // Normalize type to ensure rule engine compatibility (tempStack → temporary_stack)
    const normalizedType = touchedContact.type === 'tempStack' ? 'temporary_stack' : touchedContact.type;

    const targetInfo = {
      type: normalizedType,
      card: {
        // Preserve the card object structure
        ...(touchedContact.data || touchedContact),

        // Force the type to match normalized contact type
        type: normalizedType,

        // Explicitly preserve all build values from contact data
        displayValue: touchedContact.data?.displayValue,
        captureValue: touchedContact.data?.captureValue,
        buildValue: touchedContact.data?.buildValue,
        value: touchedContact.data?.value,

        // Preserve the cards array
        cards: touchedContact.data?.cards,

        // Preserve IDs - fall back to touchedContact.id for temp stacks
        stackId: touchedContact.data?.stackId || ((touchedContact.type === 'tempStack' || touchedContact.type === 'temporary_stack') ? touchedContact.id : undefined),
        buildId: touchedContact.data?.buildId
      },
      index: touchedContact.data?.index
    };

    // Debug: Verify build values are preserved for temp stack captures
    if (touchedContact.type === 'temporary_stack' || touchedContact.type === 'tempStack') {
    }

    try {

      const result = determineActions(draggedItem, targetInfo, gameState);
      // If rule engine finds multiple actions or requires modal, return null
      // The frontend should handle this by calling determineActions directly
      const dataPacketsLength = result.dataPackets ? result.dataPackets.length : 0;
      if (result.actions.length > 1 || result.requiresModal || dataPacketsLength > 0) {
        return null; // Signal to frontend that modal is needed
      }

      // If rule engine finds exactly one action, return it
      if (result.actions.length === 1) {
        // LOGGING: Special logging for successful temp stack captures
        if (result.actions[0].type === 'capture' && touchedContact.type === 'temporary_stack') {
        }

        return result.actions[0];
      }

      // No actions found, fall back to handlers
    } catch (error) {
      console.error('[CONTACT-ACTIONS] ❌ Error in rule engine:', error);
    }
  }

  // Fall back to specific handlers for simple cases or when rule engine fails
  switch (touchedContact.type) {
    case 'temporary_stack':
    case 'tempStack':
      return handleTempStackContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    case 'build':
      return handleBuildContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    case 'card':
      return handleLooseCardContact(draggedCard, touchedContact, gameState, currentPlayer, source);

    default:
      return null;
  }
}
