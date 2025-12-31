/**
 * Temp Stack Contact Handler
 * Handles temporary_stack contact logic
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';

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
    currentPlayer
  });

  // Handle dragging temporary stacks (build augmentation)
  const draggedStack = gameState.tableCards.find(tc =>
    (tc as any).type === 'temporary_stack' && (tc as any).stackId === contact.id
  ) as any;

  if (draggedStack && draggedStack.canAugmentBuilds) {
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
