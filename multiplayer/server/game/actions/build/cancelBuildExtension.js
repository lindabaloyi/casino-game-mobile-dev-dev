/**
 * Cancel Build Extension Action Handler
 * Cancels the pending build extension and restores original state
 */

const { createLogger } = require('../../../utils/logger');

const logger = createLogger('CancelBuildExtension');

function handleCancelBuildExtension(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info('Canceling build extension', { buildId, playerIndex });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the build with pending extension
  const buildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === buildId && card.isPendingExtension
  );

  if (buildIndex === -1) {
    logger.warn('Build with pending extension not found', { buildId });
    return gameState;
  }

  const pendingBuild = gameState.tableCards[buildIndex];

  // Restore the original build state
  const restoredBuild = {
    ...pendingBuild,
    // Clear all pending extension state
    isPendingExtension: false,
    pendingExtensionCard: undefined,
    pendingExtensionPlayer: undefined,
    // Restore original values
    cards: pendingBuild.originalCards,
    value: pendingBuild.originalValue,
    // Remove preview values
    previewValue: undefined,
    previewCards: undefined,
    previewOwner: undefined,
    originalValue: undefined,
    originalCards: undefined
  };

  // Replace with restored build
  gameState.tableCards[buildIndex] = restoredBuild;

  logger.info('Build extension canceled - restored to original state', {
    buildId,
    playerIndex,
    restoredValue: restoredBuild.value,
    cardCount: restoredBuild.cards.length
  });

  return gameState;
}

module.exports = handleCancelBuildExtension;
