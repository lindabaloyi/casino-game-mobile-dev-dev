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
 * Find a loose card in the table state by ID (format: "5♦")
 */
function findLooseCardById(cardId: string, gameState: GameState): Card | null {
  for (const tableItem of gameState.tableCards) {
    // Loose cards have no 'type' property and are Card objects
    if (isCard(tableItem) && `${tableItem.rank}${tableItem.suit}` === cardId) {
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
  if (touchedContact.type === 'build') {
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

    if (build.owner === currentPlayer) {
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
      // Different values - potential build creation (via staging)
      const totalValue = draggedCard.value + touchedCard.value;
      if (totalValue <= 10) {
        console.log('[CONTACT-ACTIONS] ✅ Different values - BUILD CREATION (via staging)');

        // Find the index of the touched card in tableCards
        const touchedIndex = findCardIndex(touchedCard, gameState);

        return {
          type: 'createStagingStack',
          payload: {
            source: 'hand',
            isTableToTable: false,
            draggedCard: draggedCard,
            targetIndex: touchedIndex,
            gameId: 1 // TODO: Get actual game ID
          }
        };
      }
    }
  }

  // No valid action determined
  console.log('[CONTACT-ACTIONS] ❌ No valid action determined');
  return null;
}
