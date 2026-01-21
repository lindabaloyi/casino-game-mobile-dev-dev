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

  console.log('[BUILD_HANDLER] 📋 Processing build contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    draggedCardValue: draggedCard.value,
    contactBuildId: contact.id,
    contactBuildData: contact.data,
    source,
    currentPlayer,
    timestamp: Date.now()
  });

  const build = findBuildById(contact.id, gameState);

  if (!build) {
    console.log('[BUILD_HANDLER] ❌ Build not found:', { buildId: contact.id });
    return null;
  }

  console.log('[BUILD_HANDLER] ✅ Found target build:', {
    buildId: build.buildId,
    buildOwner: build.owner,
    buildValue: build.value,
    isOwnedByCurrentPlayer: build.owner === currentPlayer
  });



  // Check if this is a draggable staging stack being dropped on a build
  const draggedStack = gameState.tableCards.find(tc =>
    (tc as any).type === 'temporary_stack' &&
    (tc as any).stackId === contact.id &&
    (tc as any).canAugmentBuilds
  ) as any;

  if (draggedStack && build.owner === currentPlayer) {
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

    if (valuesMatch) {
      // CAPTURE OWN BUILD: Values match, allow capture
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
      return {
        type: 'addToOwnBuild',
        payload: {
          draggedItem: { card: draggedCard, source: source || 'hand' },
          buildToAddTo: build
        }
      };
    }
  } else {
    // OPPONENT BUILD: Simple value-based logic
    const draggedValue = draggedCard.value;
    const buildValue = build.value;
    const valuesMatch = draggedValue === buildValue;

    if (valuesMatch) {
      // 🎯 EXPLICIT CAPTURE: Card value matches build value
      return {
        type: 'capture',
        payload: {
          draggedItem: { card: draggedCard, source: source || 'hand' },
          selectedTableCards: build.cards,
          targetCard: null // Build capture handled differently
        }
      };
    } else {
      // 🎯 POTENTIAL EXTENSION: Visually add card to build and show overlay
      // Check if this could be an overtake scenario (player has build with same value)
      const playerBuilds = gameState.tableCards.filter(tc =>
        (tc as any).type === 'build' && (tc as any).owner === currentPlayer
      );

      const hasMatchingPlayerBuild = playerBuilds.some(playerBuild =>
        (playerBuild as any).value === build.value + draggedCard.value
      );

      const overtakeMode = hasMatchingPlayerBuild;

      return {
        type: 'BuildExtension',
        payload: {
          extensionCard: draggedCard,
          targetBuildId: build.buildId,
          overtakeMode
        }
      };
    }
  }
}
