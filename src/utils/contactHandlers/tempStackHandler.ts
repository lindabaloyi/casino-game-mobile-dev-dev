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
  draggedItem: { card: Card; source: string },
  contact: Contact,
  gameState: GameState,
  currentPlayer: number
): { type: string; payload: any } | null {

  console.log('[TEMP_HANDLER] Processing contact:', {
    source: draggedItem.source,
    card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    contactType: contact.type,
    contactId: contact.id,
    player: currentPlayer
  });

  // SCENARIO 1: Contact with EXISTING TEMP (Addition Flow)
  if (contact.type === 'tempStack') {
    const tempStack = findTempStackById(contact.id, gameState);

    if (!tempStack) {
      console.log('[TEMP_HANDLER] ❌ Temp not found:', contact.id);
      return null;
    }

    // Ownership check
    if (tempStack.owner !== currentPlayer) {
      console.log('[TEMP_HANDLER] ❌ Cannot add to opponent temp:', {
        player: currentPlayer,
        owner: tempStack.owner,
        tempId: tempStack.stackId
      });
      return null;
    }

    // Prevent temp-to-temp
    const draggedFromTemp = isCardInTemp(draggedItem.card, gameState);
    if (draggedFromTemp) {
      console.log('[TEMP_HANDLER] ❌ Cannot drag from temp to temp');
      return null;
    }

    console.log('[TEMP_HANDLER] ✅ Adding to own temp:', {
      tempId: tempStack.stackId,
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      source: draggedItem.source
    });

    return {
      type: 'addToOwnTemp',
      payload: {
        stackId: tempStack.stackId,
        card: draggedItem.card,
        source: draggedItem.source
      }
    };
  }

  // SCENARIO 2: Contact with LOOSE CARD (Creation Flow)
  if (contact.type === 'loose' || contact.type === 'card') {
    const targetCard = findLooseCardById(contact.id, gameState);

    if (!targetCard) {
      console.log('[TEMP_HANDLER] ❌ Loose card not found:', contact.id);
      return null;
    }

    // Prevent dragging card onto itself
    if (draggedItem.card.rank === targetCard.rank &&
        draggedItem.card.suit === targetCard.suit) {
      console.log('[TEMP_HANDLER] ❌ Cannot create temp with same card');
      return null;
    }

    // Check if player already has active temp
    const existingTemp = findActiveTemp(gameState, currentPlayer);
    if (existingTemp) {
      console.log('[TEMP_HANDLER] ❌ Player already has active temp:', {
        tempId: existingTemp.stackId,
        cards: existingTemp.cards?.length || 0
      });
      return null;
    }

    // Prevent using cards already in temps
    const draggedFromTemp = isCardInTemp(draggedItem.card, gameState);
    if (draggedFromTemp) {
      console.log('[TEMP_HANDLER] ❌ Card is already in a temp');
      return null;
    }

    const isTableToTable = draggedItem.source === 'table';
    const sourceLocation = isTableToTable ? 'table' : 'hand';

    console.log('[TEMP_HANDLER] ✅ Creating new temp', {
      source: sourceLocation,
      isTableToTable,
      cards: [
        `${targetCard.rank}${targetCard.suit} (target)`,
        `${draggedItem.card.rank}${draggedItem.card.suit} (dragged)`
      ],
      player: currentPlayer
    });

    return {
      type: 'createTemp',
      payload: {
        cards: [targetCard, draggedItem.card], // Target first, dragged second
        isTableToTable,
        sourceLocation,
        playerIndex: currentPlayer,
        // Note: gameId will be added by the action router
        // Optional metadata for debugging
        targetCard,
        draggedCard: draggedItem.card
      }
    };
  }

  console.log('[TEMP_HANDLER] Ignoring contact type:', contact.type);
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
