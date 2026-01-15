/**
 * Enhanced Temp Contact Handler
 * Handles BOTH creation (loose card contact) and addition (temp stack contact)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findLooseCardById, findTempStackById } from '../contactUtils';

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Check if table item is a temp stack
 */
function isTempStack(item: any): boolean {
  return item?.type === 'temporary_stack' || item?.type === 'temp_stack';
}

/**
 * Enhanced Temp Contact Handler
 */
export function handleTempStackContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number,
  source?: string
): { type: string; payload: any } | null {
  // SCENARIO 1: Contact with EXISTING TEMP (Addition Flow)
  if (contact.type === 'tempStack') {
    const tempStack = findTempStackById(contact.id, gameState);

    if (!tempStack) {
      return null;
    }

    // Ownership check
    if (tempStack.owner !== currentPlayer) {
      return null;
    }

    // Prevent temp-to-temp
    const draggedFromTemp = isCardInTemp(draggedCard, gameState);
    if (draggedFromTemp) {
      return null;
    }
    return {
      type: 'addToOwnTemp',
      payload: {
        stackId: tempStack.stackId,
        card: draggedCard,
        source: source
      }
    };
  }

  // SCENARIO 2: Contact with LOOSE CARD (Creation Flow)
  if (contact.type === 'loose' || contact.type === 'card') {
    const targetCard = findLooseCardById(contact.id, gameState);

    if (!targetCard) {
      return null;
    }

    // Prevent dragging card onto itself
    if (draggedCard.rank === targetCard.rank &&
        draggedCard.suit === targetCard.suit) {
      return null;
    }

    // Check if player already has active temp
    const existingTemp = findActiveTemp(gameState, currentPlayer);
    if (existingTemp) {
      return null;
    }

    // Prevent using cards already in temps
    const draggedFromTemp = isCardInTemp(draggedCard, gameState);
    if (draggedFromTemp) {
      return null;
    }

    const isTableToTable = source === 'table';
    const sourceLocation = isTableToTable ? 'table' : 'hand';

    console.log('[TEMP_HANDLER] ✅ Creating new temp', {
      source: sourceLocation,
      isTableToTable,
      cards: [
        `${targetCard.rank}${targetCard.suit} (target)`,
        `${draggedCard.rank}${draggedCard.suit} (dragged)`
      ],
      player: currentPlayer
    });

    return {
      type: 'createTemp',
      payload: {
        cards: [targetCard, draggedCard], // Target first, dragged second
        isTableToTable,
        sourceLocation,
        playerIndex: currentPlayer,
        // Note: gameId will be added by the action router
        // Optional metadata for debugging
        targetCard,
        draggedCard: draggedCard
      }
    };
  }
  return null;
}

// Helper functions
function isCardInTemp(card: Card, gameState: GameState): boolean {
  return gameState.tableCards.some((tc: any) => {
    if (!isTempStack(tc)) return false;
    return (tc.cards || []).some((c: any) =>
      c.rank === card.rank && c.suit === card.suit
    );
  });
}

function findActiveTemp(gameState: GameState, playerIndex: number): any {
  return gameState.tableCards.find((tc: any) => {
    if (!isTempStack(tc)) return false;
    return tc.owner === playerIndex;
  });
}
