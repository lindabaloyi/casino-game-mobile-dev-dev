/**
 * Determine game action based on contact between cards
 */

import type { Build, Card, GameState } from '../../multiplayer/server/game-logic/game-state';

/**
 * Type guards for TableCard union type
 */
function isCard(item: any): item is Card {
  return item && typeof item === 'object' &&
         typeof item.suit === 'string' &&
         typeof item.rank === 'string' &&
         typeof item.value === 'number';
}

function isBuild(item: any): item is Build {
  return item && typeof item === 'object' &&
         item.type === 'build' &&
         typeof item.buildId === 'string' &&
         Array.isArray(item.cards) &&
         typeof item.value === 'number' &&
         typeof item.owner === 'number';
}

/**
 * Find a loose card in the table state by ID (format: "5♦" or "5♦_0")
 */
function findLooseCardById(cardId: string, gameState: GameState): Card | null {
  // Extract card part from ID (remove index suffix if present)
  const cardPart = cardId.split('_')[0];

  for (const tableItem of gameState.tableCards) {
    // Loose cards have no 'type' property and are Card objects
    if (isCard(tableItem) && `${tableItem.rank}${tableItem.suit}` === cardPart) {
      return tableItem;
    }
  }
  return null;
}

/**
 * Find a build in the table state by ID
 */
function findBuildById(buildId: string, gameState: GameState): Build | null {
  for (const tableItem of gameState.tableCards) {
    if (isBuild(tableItem) && tableItem.buildId === buildId) {
      return tableItem;
    }
  }
  return null;
}

/**
 * Find the index of a loose card in tableCards
 */
function findCardIndex(card: Card, gameState: GameState): number {
  return gameState.tableCards.findIndex(item =>
    isCard(item) && item.rank === card.rank && item.suit === card.suit
  );
}

/**
 * Determine the appropriate action based on card contact
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
  currentPlayer: number
): { type: string; payload: any } | null {

  console.log('[CONTACT-ACTIONS] 🎯 Determining action from contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    touchedId: touchedContact.id,
    touchedType: touchedContact.type,
    currentPlayer
  });

  // Handle different contact types
  if (touchedContact.type === 'temporary_stack') {
    // Handle dragging temporary stacks (build augmentation)
    const draggedStack = gameState.tableCards.find(tc =>
      (tc as any).type === 'temporary_stack' && (tc as any).stackId === touchedContact.id
    ) as any;

    if (draggedStack && draggedStack.canAugmentBuilds) {
      console.log('[CONTACT-ACTIONS] 🏗️ Draggable staging stack being dragged (can augment builds)');
      // This will be handled by the build contact logic below
      return null; // Let build contact logic handle it
    }
  } else if (touchedContact.type === 'build') {
    const build = findBuildById(touchedContact.id, gameState);

    if (!build) {
      console.log('[CONTACT-ACTIONS] ❌ Build not found in game state:', touchedContact.id);
      return null;
    }

    console.log('[CONTACT-ACTIONS] 🔍 Found build:', {
      buildId: build.buildId,
      owner: build.owner,
      value: build.value,
      cards: build.cards.length
    });

    // Check if this is a draggable staging stack being dropped on a build
    const draggedStack = gameState.tableCards.find(tc =>
      (tc as any).type === 'temporary_stack' &&
      (tc as any).stackId === touchedContact.id &&
      (tc as any).canAugmentBuilds
    ) as any;

    if (draggedStack && build.owner === currentPlayer) {
      console.log('[CONTACT-ACTIONS] 🏗️ Draggable staging stack dropped on build for augmentation:', {
        stagingStackId: draggedStack.stackId,
        targetBuildId: touchedContact.id,
        stagingValue: draggedStack.value,
        buildValue: build.value
      });
      return {
        type: 'finalizeBuildAugmentation',
        payload: {
          stagingStackId: draggedStack.stackId,
          targetBuildId: touchedContact.id
        }
      };
    } else if (build.owner === currentPlayer) {
      // Add to own build
      console.log('[CONTACT-ACTIONS] ✅ Player adding to own build');
      return {
        type: 'addToBuilding',
        payload: {
          buildId: touchedContact.id,
          card: draggedCard,
          source: 'hand'
        }
      };
    } else {
      // Capture opponent's build
      console.log('[CONTACT-ACTIONS] ✅ Player capturing opponent build');
      return {
        type: 'capture',
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          selectedTableCards: build.cards,
          targetCard: null // Build capture handled differently
        }
      };
    }

  } else if (touchedContact.type === 'temporary_stack') {
    // Touched a temp stack - add card to existing stack (table-to-table)
    const tempStack = gameState.tableCards.find(tc =>
      (tc as any).type === 'temporary_stack' && (tc as any).stackId === touchedContact.id
    ) as any;

    if (!tempStack) {
      console.log('[CONTACT-ACTIONS] ❌ Temp stack not found in game state:', touchedContact.id);
      return null;
    }

    console.log('[CONTACT-ACTIONS] 🔍 Found temp stack:', {
      stackId: tempStack.stackId,
      currentCards: tempStack.cards.length,
      currentValue: tempStack.value,
      owner: tempStack.owner
    });

    // Add card to existing temp stack (unlimited, freedom-first approach)
    console.log('[CONTACT-ACTIONS] ✅ Adding card to existing temp stack');
    return {
      type: 'addToStagingStack',
      payload: {
        gameId: 1, // TODO: Get actual game ID
        stackId: tempStack.stackId,
        card: draggedCard,
        source: 'table' // Table-to-table drop
      }
    };

  } else if (touchedContact.type === 'card') {
    // Touched a loose card
    const touchedCard = findLooseCardById(touchedContact.id, gameState);

    if (!touchedCard) {
      console.log('[CONTACT-ACTIONS] ❌ Card not found in game state:', touchedContact.id);
      return null;
    }

    console.log('[CONTACT-ACTIONS] 🔍 Found loose card:', {
      card: `${touchedCard.rank}${touchedCard.suit}`,
      value: touchedCard.value
    });

    if (draggedCard.value === touchedCard.value) {
      // Capture matching card
      console.log('[CONTACT-ACTIONS] ✅ Matching values - CAPTURE');
      return {
        type: 'capture',
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          selectedTableCards: [touchedCard],
          targetCard: touchedCard
        }
      };
    } else {
      // Universal staging: Always allow staging for all players
      const totalValue = draggedCard.value + touchedCard.value;
      if (totalValue <= 10) {
        // Check if player has active builds for contextual logging
        const playerHasBuilds = gameState.tableCards.some(tc =>
          (tc as any).type === 'build' && (tc as any).owner === currentPlayer
        );

        console.log('[CONTACT-ACTIONS] 🎯 UNIVERSAL STAGING TRIGGERED:', {
          player: currentPlayer,
          draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
          touchedCard: `${touchedCard.rank}${touchedCard.suit}`,
          totalValue,
          playerHasBuilds,
          stagingType: playerHasBuilds ? 'enhanced (with augmentation)' : 'basic (capture only)',
          reason: 'Universal staging available to all players'
        });

        // Find the index of the touched card in tableCards
        const touchedIndex = findCardIndex(touchedCard, gameState);

        // Use single staging action for all players
        const action = {
          type: 'createStagingStack',
          payload: {
            source: 'hand',
            isTableToTable: false,
            card: draggedCard,
            targetIndex: touchedIndex,
            gameId: 1, // TODO: Get actual game ID
            // Include build augmentation capability flag
            canAugmentBuilds: playerHasBuilds
          }
        };

        console.log('[CONTACT-ACTIONS] 🚀 Sending universal staging action:', {
          actionType: action.type,
          canAugmentBuilds: action.payload.canAugmentBuilds,
          stagingValue: totalValue
        });

        return action;
      }
    }
  }

  // No valid action determined
  console.log('[CONTACT-ACTIONS] ❌ No valid action determined');
  return null;
}
