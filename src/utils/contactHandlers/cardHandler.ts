/**
 * Loose Card Contact Handler
 * Handles loose card contact logic (capture/staging)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findCardIndex, findLooseCardById } from '../contactUtils';

/**
 * Calculate all valid build options for same-value cards
 * Returns array of build options with their capture requirements
 */
function calculateAllBuildOptions(draggedCard: Card, touchedCard: Card, playerHand: Card[]): {
  buildValue: number;
  captureCard: number;
  type: 'spare' | 'sum';
  description: string;
}[] {
  const value = draggedCard.value;

  const options: {
    buildValue: number;
    captureCard: number;
    type: 'spare' | 'sum';
    description: string;
  }[] = [];

  // Option 1: Spare same-value card build (build with same value)
  const spareCards = playerHand.filter(card =>
    card.value === value &&
    !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
  );

  if (spareCards.length > 0) {
    options.push({
      buildValue: value,
      captureCard: value,
      type: 'spare',
      description: `Build ${value} (captured by spare ${value})`
    });
  }

  // Option 2: Sum build (only for low cards 1-5, sum = value + value)
  if (value <= 5) {
    const sumValue = value * 2;
    const hasSumCard = playerHand.some(card => card.value === sumValue);

    if (hasSumCard) {
      options.push({
        buildValue: sumValue,
        captureCard: sumValue,
        type: 'sum',
        description: `Build ${sumValue} (${value}+${value}, captured by ${sumValue})`
      });
    }
  }

  return options;
}

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
  currentPlayer: number,
  source?: string
): { type: string; payload: any } | null {

  const touchedCard = findLooseCardById(contact.id, gameState);

  if (!touchedCard) {
    return null;
  }

  // Allow creative freedom: Players can combine ANY cards in temp stacks
  // Validation happens during build creation, not staging
  const totalValue = draggedCard.value + touchedCard.value;
  const isSameValue = draggedCard.value === touchedCard.value;

  // For same-value interactions, calculate all build options
  let buildOptions: {
    buildValue: number;
    captureCard: number;
    type: 'spare' | 'sum';
    description: string;
  }[] = [];

  if (isSameValue) {
    const playerHand = gameState.playerHands[currentPlayer];
    buildOptions = calculateAllBuildOptions(draggedCard, touchedCard, playerHand);

    // If no build options available, do immediate capture
    if (buildOptions.length === 0) {
      return {
        type: 'capture',
        payload: {
          targetCards: [touchedCard, draggedCard],
          capturingCard: draggedCard,
          captureValue: draggedCard.value,
          captureType: 'same_value_auto'
        }
      };
    }
  }

  // Allow all combinations for maximum player creativity
  if (isSameValue || totalValue > 0) {
    // Check if player has active builds for contextual logging
    const playerHasBuilds = gameState.tableCards.some(tc =>
      (tc as any).type === 'build' && (tc as any).owner === currentPlayer
    );

    // Find the index of the touched card in tableCards
    const touchedIndex = findCardIndex(touchedCard, gameState);

    // Use single staging action for all players
    const action = {
      type: 'createTemp',
      payload: {
        source: source || 'hand',
        isTableToTable: false,
        card: draggedCard,
        targetIndex: touchedIndex,
        // Include build augmentation capability flag
        canAugmentBuilds: playerHasBuilds,
        // Mark same-value stacks for special handling
        isSameValueStack: isSameValue,
        // Include calculated build options for same-value stacks
        sameValueBuildOptions: isSameValue ? buildOptions : []
      }
    };

    return action;
  }

  return null;
}
