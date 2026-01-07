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
  currentPlayer: number,
  source?: string
): { type: string; payload: any } | null {

  console.log('[BUILD_HANDLER] 🎯 Handling build contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    contactId: contact.id,
    currentPlayer,
    timestamp: new Date().toISOString()
  });

  const build = findBuildById(contact.id, gameState);

  if (!build) {
    console.log('[BUILD_HANDLER] ❌ Build not found in game state:', {
      contactId: contact.id,
      availableBuilds: gameState.tableCards.filter(c => (c as any).type === 'build').map(b => (b as any).buildId),
      allTableCards: gameState.tableCards.map(c => {
        const card = c as any;
        return `${card.type || 'card'}:${card.buildId || `${card.rank || '?'}${card.suit || '?'}`}`;
      })
    });
    return null;
  }

  console.log('[BUILD_HANDLER] 🔍 Found build:', {
    buildId: build.buildId,
    owner: build.owner,
    value: build.value,
    cardsCount: build.cards?.length || 0,
    cards: build.cards?.map(c => `${c.rank}${c.suit}`) || [],
    isMyBuild: build.owner === currentPlayer
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
    // OWNED BUILD: Check if card matches build value for capture
    const draggedValue = draggedCard.value;
    const buildValue = build.value;
    const valuesMatch = draggedValue === buildValue;

    console.log('[BUILD_HANDLER] 🎯 Owned build interaction:', {
      draggedValue,
      buildValue,
      valuesMatch,
      buildCards: build.cards?.map(c => `${c.rank}${c.suit}`) || []
    });

    if (valuesMatch) {
      // CAPTURE OWN BUILD: Values match, allow capture
      console.log('[BUILD_HANDLER] ✅ Player capturing own build (value match)');
      return {
        type: 'capture',
        payload: {
          draggedItem: { card: draggedCard, source: source || 'hand' },
          selectedTableCards: build.cards,
          targetCard: null // Build capture handled differently
        }
      };
    } else {
      // ADD TO OWN BUILD: Values don't match, add to build
      console.log('[BUILD_HANDLER] ✅ Player adding to own build (value mismatch)');
      return {
        type: 'addToOwnBuild',
        payload: {
          draggedItem: { card: draggedCard, source: source || 'hand' },
          buildToAddTo: build
        }
      };
    }
  } else {
    // Capture opponent's build
    console.log('[BUILD_HANDLER] ✅ Player capturing opponent build');
    return {
      type: 'capture',
      payload: {
        draggedItem: { card: draggedCard, source: source || 'hand' },
        selectedTableCards: build.cards,
        targetCard: null // Build capture handled differently
      }
    };
  }
}
