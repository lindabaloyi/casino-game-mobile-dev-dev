/**
 * Temp Stack Contact Handler
 * Handles temporary_stack contact logic
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findTempStackById } from '../contactUtils';

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Handle temporary_stack contact
 */
export function handleTempStackContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number
): { type: string; payload: any } | null {

  console.log('[TEMP_STACK_HANDLER] 🎯 Handling temporary_stack contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    contactId: contact.id,
    currentPlayer,
    timestamp: new Date().toISOString()
  });

  const tempStack = findTempStackById(contact.id, gameState);

  if (!tempStack) {
    console.log('[TEMP_STACK_HANDLER] ❌ Temp stack not found in game state:', {
      contactId: contact.id,
      availableTempStacks: gameState.tableCards
        .filter(tc => (tc as any).type === 'temporary_stack')
        .map(ts => ({
          stackId: (ts as any).stackId,
          owner: (ts as any).owner,
          value: (ts as any).value,
          cardsCount: (ts as any).cards?.length || 0,
          canAugmentBuilds: (ts as any).canAugmentBuilds
        })),
      allTableCards: gameState.tableCards.map(c => {
        const card = c as any;
        return `${card.type || 'card'}:${card.stackId || card.buildId || `${card.rank || '?'}${card.suit || '?'}`}`;
      })
    });
    return null;
  }

  console.log('[TEMP_STACK_HANDLER] 🔍 Found temp stack:', {
    stackId: tempStack.stackId,
    owner: tempStack.owner,
    value: tempStack.value,
    cardsCount: tempStack.cards?.length || 0,
    cards: tempStack.cards?.map(c => `${c.rank}${c.suit}`) || [],
    canAugmentBuilds: tempStack.canAugmentBuilds,
    isMyStack: tempStack.owner === currentPlayer
  });

  // Handle dragging temporary stacks (build augmentation)
  if (tempStack.canAugmentBuilds) {
    console.log('[TEMP_STACK_HANDLER] 🏗️ Draggable staging stack being dragged (can augment builds)');
    // This will be handled by the build contact logic below
    return null; // Let build contact logic handle it
  }

  // Add card to existing temp stack (table-to-table)
  console.log('[TEMP_STACK_HANDLER] 📦 Adding card to existing temp stack');
  return {
    type: 'addToStagingStack',
    payload: {
      stackId: contact.id,
      card: draggedCard,
      source: 'table' // Table-to-table drop
    }
  };
}
