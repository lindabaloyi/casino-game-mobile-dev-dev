/**
 * Build Extension Utilities
 * Core logic for determining build extension eligibility and processing extensions
 */

import { Card } from '../../multiplayer/server/game-logic/game-state';

export interface Build {
  buildId: string;
  type: 'build';
  cards: Card[];
  value: number;
  owner: number;
  isExtendable: boolean;
  hasBase?: boolean;
  isSingleCombination?: boolean;
}

/**
 * Check if a build can be extended by opponents
 * Eligibility criteria:
 * - Less than 5 cards
 * - No base structure (pure sum-based)
 * - Single combination only (unambiguous)
 * - Currently extendable flag set
 */
export function canBuildBeExtended(build: Build, currentPlayer: number): boolean {
  // Must not be owned by current player
  if (build.owner === currentPlayer) {
    return false;
  }

  // Must have less than 5 cards
  if (build.cards.length >= 5) {
    return false;
  }

  // Must not have base structure (pure sum-based builds only)
  if (build.hasBase) {
    return false;
  }

  // Must have single combination only (unambiguous)
  if (!build.isSingleCombination) {
    return false;
  }

  // Must be marked as extendable
  if (!build.isExtendable) {
    return false;
  }

  return true;
}

/**
 * Analyze build structure to determine if it's extendable
 * Called when creating builds to set eligibility flags
 */
export function analyzeBuildForExtension(cards: Card[]): {
  hasBase: boolean;
  isSingleCombination: boolean;
  isExtendable: boolean;
} {
  const totalSum = cards.reduce((sum, card) => sum + card.value, 0);

  // Check for base structure (one card that supports = total - supports)
  let hasBase = false;
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((sum, card) => sum + card.value, 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      hasBase = true;
      break;
    }
  }

  // Check if single combination (only one way to interpret the build)
  // For now, assume pure sum builds are single combination
  const isSingleCombination = !hasBase;

  // Build is extendable if: <5 cards, no base, single combination
  const isExtendable = cards.length < 5 && !hasBase && isSingleCombination;

  return {
    hasBase,
    isSingleCombination,
    isExtendable
  };
}

/**
 * Validate that a single card extension maintains build validity
 * Extension must result in a valid build with new total
 */
export function validateBuildExtension(build: Build, extensionCard: Card): {
  valid: boolean;
  newValue: number;
  error?: string;
} {
  // Calculate new total
  const newValue = build.value + extensionCard.value;

  // Extension must maintain valid build (new total <= 10 for casino rules)
  if (newValue > 10) {
    return {
      valid: false,
      newValue,
      error: `Extension would create invalid build value: ${newValue} (max 10)`
    };
  }

  // Additional validation can be added here
  // For now, single card extensions are always valid if under the limit

  return {
    valid: true,
    newValue
  };
}

/**
 * Create updated build state after successful extension
 * Transfers ownership and updates value/cards
 */
export function createExtendedBuild(build: Build, extensionCard: Card, newOwner: number, newValue: number): Build {
  return {
    ...build,
    cards: [...build.cards, extensionCard],
    value: newValue,
    owner: newOwner,
    // Re-analyze for extension eligibility with new card
    ...analyzeBuildForExtension([...build.cards, extensionCard])
  };
}

/**
 * Check if build extension should end the turn
 * Extensions always end the turn (like captures)
 */
export function shouldExtensionEndTurn(): boolean {
  return true; // Build extensions always end the turn
}