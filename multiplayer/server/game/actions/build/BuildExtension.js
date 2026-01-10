/**
 * Build Extension Action Handler
 * Directly extends opponent build with ownership transfer
 */

const { createLogger } = require('../../../utils/logger');

const logger = createLogger('BuildExtension');

function handleBuildExtension(gameManager, playerIndex, action, gameId) {
  const { extensionCard, targetBuildId } = action.payload;

  logger.info('Build extension - creating pending extension overlay', {
    extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
    targetBuildId,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the target build
  const targetBuildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === targetBuildId
  );

  if (targetBuildIndex === -1) {
    logger.warn('Target build not found', { targetBuildId });
    return gameState;
  }

  const targetBuild = gameState.tableCards[targetBuildIndex];

  // Create pending extension state - similar to temp stacks
  const pendingExtensionBuild = {
    ...targetBuild,
    // Mark as pending extension (like temp stacks)
    isPendingExtension: true,
    pendingExtensionCard: extensionCard,
    pendingExtensionPlayer: playerIndex,
    // Store original values for cancellation
    originalValue: targetBuild.value,
    originalCards: [...targetBuild.cards],
    // Calculate preview values
    previewValue: targetBuild.value + extensionCard.value,
    previewCards: [...targetBuild.cards, extensionCard],
    previewOwner: playerIndex
  };

  // Replace the build with the pending extension version
  gameState.tableCards[targetBuildIndex] = pendingExtensionBuild;

  logger.info('Build extension pending - overlay should appear', {
    buildId: targetBuild.buildId,
    playerIndex,
    extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
    previewValue: pendingExtensionBuild.previewValue
  });

  // Don't switch turns - wait for player to accept/cancel
  return gameState;
}

module.exports = handleBuildExtension;
