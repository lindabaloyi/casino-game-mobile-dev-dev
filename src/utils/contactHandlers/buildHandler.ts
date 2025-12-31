/**
 * Build Contact Handler
 * Handles build contact logic (add/capture/augmentation)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findBuildById } from '../contactUtils';

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Handle build contact
 */
export function handleBuildContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number
): { type: string; payload: any } | null {

  console.log('[BUILD_HANDLER] 🎯 Handling build contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    contactId: contact.id,
    currentPlayer
  });

  const build = findBuildById(contact.id, gameState);

  if (!build) {
    console.log('[BUILD_HANDLER] ❌ Build not found in game state:', contact.id);
    return null;
  }

  console.log('[BUILD_HANDLER] 🔍 Found build:', {
    buildId: build.buildId,
    owner: build.owner,
    value: build.value,
    cards: build.cards.length
  });

  // Check if this is a draggable staging stack being dropped on a build
  const draggedStack = gameState.tableCards.find(tc =>
    (tc as any).type === 'temporary_stack' &&
    (tc as any).stackId === contact.id &&
    (tc as any).canAugmentBuilds
  ) as any;

  if (draggedStack && build.owner === currentPlayer) {
    console.log('[BUILD_HANDLER] 🏗️ Draggable staging stack dropped on build for augmentation:', {
      stagingStackId: draggedStack.stackId,
      targetBuildId: contact.id,
      stagingValue: draggedStack.value,
      buildValue: build.value
    });
    return {
      type: 'finalizeBuildAugmentation',
      payload: {
        stagingStackId: draggedStack.stackId,
        targetBuildId: contact.id
      }
    };
  } else if (build.owner === currentPlayer) {
    // Add to own build
    console.log('[BUILD_HANDLER] ✅ Player adding to own build');
    return {
      type: 'addToBuilding',
      payload: {
        buildId: contact.id,
        card: draggedCard,
        source: 'hand'
      }
    };
  } else {
    // Capture opponent's build
    console.log('[BUILD_HANDLER] ✅ Player capturing opponent build');
    return {
      type: 'capture',
      payload: {
        draggedItem: { card: draggedCard, source: 'hand' },
        selectedTableCards: build.cards,
        targetCard: null // Build capture handled differently
      }
    };
  }
}
