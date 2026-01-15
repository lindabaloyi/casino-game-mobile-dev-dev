/**
 * Build Extension Contact Handler
 * Detects and handles opponent attempts to extend builds
 */

import { Card } from '../../../multiplayer/server/game-logic/game-state';
import { Build, canBuildBeExtended } from '../buildExtensionUtils';

/**
 * Check if a card drop on a build should trigger build extension
 */
export function isBuildExtensionAttempt(
  draggedCard: Card,
  targetBuild: Build,
  currentPlayer: number
): boolean {
  // Must be exactly one card (single card extension)
  if (!draggedCard) {
    return false;
  }

  // Build must be extendable by current player
  return canBuildBeExtended(targetBuild, currentPlayer);
}

/**
 * Create a temp stack for build extension
 * This is different from regular temp stacks - it's specifically for extending builds
 */
export function createExtensionTempStack(
  extensionCard: Card,
  targetBuild: Build,
  playerIndex: number
): any {
  return {
    type: 'temporary_stack',
    stackId: `extension-${playerIndex}-${Date.now()}`,
    cards: [extensionCard],
    owner: playerIndex,
    value: extensionCard.value,
    combinedValue: extensionCard.value,
    possibleBuilds: [], // No build options for extensions
    isTableToTable: false,
    canAugmentBuilds: false,
    // Special markers for build extension
    isBuildExtension: true,
    targetBuildId: targetBuild.buildId,
    extensionCard: extensionCard,
    expectedNewValue: targetBuild.value + extensionCard.value
  };
}

/**
 * Handle build extension contact in the contact detection system
 * Called from the main contact detection logic
 */
export function handleBuildExtensionContact(
  draggedCard: Card,
  targetBuild: Build,
  currentPlayer: number
): {
  shouldHandle: boolean;
  tempStack?: any;
  actionType?: string;
} {
  if (!isBuildExtensionAttempt(draggedCard, targetBuild, currentPlayer)) {
    return { shouldHandle: false };
  }

  // Create extension temp stack
  const tempStack = createExtensionTempStack(draggedCard, targetBuild, currentPlayer);
  return {
    shouldHandle: true,
    tempStack,
    actionType: 'createTemp' // Use existing temp stack creation action
  };
}