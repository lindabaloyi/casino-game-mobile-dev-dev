/**
 * Cancel Build Extension Action Handler
 * Removes the extension card from a build when player cancels the extension
 */

const { createLogger } = require('../../../utils/logger');

const logger = createLogger('CancelBuildExtension');

function handleCancelBuildExtension(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info('Cancelling build extension - removing extension card from build', {
    buildId,
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the build with pending extension
  const targetBuildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === buildId && card.isPendingExtension
  );

  if (targetBuildIndex === -1) {
    logger.warn('Build with pending extension not found', { buildId });
    return gameState;
  }

  const targetBuild = gameState.tableCards[targetBuildIndex];

  // Get the card that was being extended
  const extensionCard = targetBuild.pendingExtensionCard;
  if (!extensionCard) {
    logger.warn('No pending extension card found to restore', { buildId });
    return gameState;
  }

  // Restore the build to its original state
  const restoredBuild = {
    ...targetBuild,
    cards: targetBuild.originalCards || targetBuild.cards.slice(0, -1), // Remove last card (extension)
    value: targetBuild.originalValue || (targetBuild.value - extensionCard.value),
    // Remove pending extension flags
    isPendingExtension: undefined,
    pendingExtensionCard: undefined,
    originalValue: undefined,
    originalCards: undefined,
    extensionDetails: undefined
  };

  // Replace the build with the restored version
  gameState.tableCards[targetBuildIndex] = restoredBuild;

  // Restore the card to player's hand
  const playerHand = gameState.playerHands[playerIndex];
  playerHand.push(extensionCard);

  logger.info('Build extension cancelled - card restored to hand', {
    buildId,
    playerIndex,
    buildRestored: {
      originalCardCount: targetBuild.cards.length,
      restoredCardCount: restoredBuild.cards.length,
      originalValue: targetBuild.value,
      restoredValue: restoredBuild.value
    },
    cardRestored: `${extensionCard.rank}${extensionCard.suit}`,
    handSize: playerHand.length
  });

  return gameState;
}

module.exports = handleCancelBuildExtension;