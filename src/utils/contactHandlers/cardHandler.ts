/**
 * Loose Card Contact Handler
 * Handles loose card contact logic (capture/staging)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findCardIndex, findLooseCardById } from '../contactUtils';

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Handle loose card contact
 */
export function handleLooseCardContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number
): { type: string; payload: any } | null {

  console.log('[CARD_HANDLER] 🎯 Handling loose card contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    contactId: contact.id,
    currentPlayer
  });

  const touchedCard = findLooseCardById(contact.id, gameState);

  if (!touchedCard) {
    console.log('[CARD_HANDLER] ❌ Card not found in game state:', contact.id);
    return null;
  }

  console.log('[CARD_HANDLER] 🔍 Found loose card:', {
    card: `${touchedCard.rank}${touchedCard.suit}`,
    value: touchedCard.value
  });

  // Allow creative freedom: Players can combine ANY cards in temp stacks
  // Validation happens during build creation, not staging
  const totalValue = draggedCard.value + touchedCard.value;
  const isSameValue = draggedCard.value === touchedCard.value;

  // Allow all combinations for maximum player creativity
  if (isSameValue || totalValue > 0) {
    // Check if player has active builds for contextual logging
    const playerHasBuilds = gameState.tableCards.some(tc =>
      (tc as any).type === 'build' && (tc as any).owner === currentPlayer
    );

    console.log('[CARD_HANDLER] 🎯 STAGING TRIGGERED:', {
      player: currentPlayer,
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      touchedCard: `${touchedCard.rank}${touchedCard.suit}`,
      totalValue,
      isSameValue,
      playerHasBuilds,
      stagingType: isSameValue ? 'same-value (strategic options)' : (playerHasBuilds ? 'enhanced (with augmentation)' : 'basic (capture only)'),
      reason: isSameValue ? 'Same-value cards need strategic options' : 'Universal staging available to all players'
    });

    // Find the index of the touched card in tableCards
    const touchedIndex = findCardIndex(touchedCard, gameState);

    // Use single staging action for all players
    const action = {
      type: 'createTemp',
      payload: {
        source: 'hand',
        isTableToTable: false,
        card: draggedCard,
        targetIndex: touchedIndex,
        // Include build augmentation capability flag
        canAugmentBuilds: playerHasBuilds,
        // Mark same-value stacks for special handling
        isSameValueStack: isSameValue
      }
    };

    console.log('[CARD_HANDLER] 🚀 Sending staging action:', {
      actionType: action.type,
      canAugmentBuilds: action.payload.canAugmentBuilds,
      isSameValueStack: action.payload.isSameValueStack,
      stagingValue: totalValue
    });

    return action;
  }

  return null;
}
