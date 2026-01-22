/**
 * Contact Utilities
 * Type guards and helper functions for contact-based card interactions
 */

import type { Build, Card, GameState } from '../../multiplayer/server/game-logic/game-state';

export interface TempStack {
  type: 'temporary_stack' | 'tempStack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
  canAugmentBuilds?: boolean;
  [key: string]: any;
}

/**
 * Type guard for Card objects
 */
export function isCard(item: any): item is Card {
  return item && typeof item === 'object' &&
         typeof item.suit === 'string' &&
         typeof item.rank === 'string' &&
         typeof item.value === 'number';
}

/**
 * Type guard for Build objects
 */
export function isBuild(item: any): item is Build {
  return item && typeof item === 'object' &&
         item.type === 'build' &&
         typeof item.buildId === 'string' &&
         Array.isArray(item.cards) &&
         typeof item.value === 'number' &&
         typeof item.owner === 'number';
}

/**
 * Type guard for TempStack objects
 * Accepts both client-side "tempStack" and server-side "temporary_stack" types
 */
export function isTempStack(item: any): item is TempStack {
  return item && typeof item === 'object' &&
         (item.type === 'temporary_stack' || item.type === 'tempStack') &&
         typeof item.stackId === 'string' &&
         Array.isArray(item.cards) &&
         typeof item.owner === 'number' &&
         typeof item.value === 'number';
}

/**
 * Find a loose card in the table state by ID (format: "5♦" or "5♦_0")
 */
export function findLooseCardById(cardId: string, gameState: GameState): Card | null {
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
export function findBuildById(buildId: string, gameState: GameState): Build | null {
  for (const tableItem of gameState.tableCards) {
    if (isBuild(tableItem) && tableItem.buildId === buildId) {
      return tableItem;
    }
  }
  return null;
}

/**
 * Find a temporary stack in the table state by ID
 */
export function findTempStackById(stackId: string, gameState: GameState): TempStack | null {
  for (const tableItem of gameState.tableCards) {
    if (isTempStack(tableItem) && tableItem.stackId === stackId) {
      return tableItem;
    }
  }
  return null;
}

/**
 * Find the index of a loose card in tableCards
 */
export function findCardIndex(card: Card, gameState: GameState): number {
  return gameState.tableCards.findIndex(item =>
    isCard(item) && item.rank === card.rank && item.suit === card.suit
  );
}
