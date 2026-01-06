/**
 * Determine game action based on contact between cards
 * Clean router that delegates to specific contact handlers
 */

import type { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { handleBuildContact, handleLooseCardContact, handleTempStackContact } from './contactHandlers';

/**
 * Determine the appropriate action based on card contact
 * Clean router that delegates to focused handlers by contact type
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

  // Route to specific handlers based on contact type
  switch (touchedContact.type) {
    case 'temporary_stack':
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
