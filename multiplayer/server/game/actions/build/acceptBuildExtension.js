/**
 * Accept Build Extension Action Handler
 * Finalizes the build extension after player confirmation
 */

const { createLogger } = require('../../../utils/logger');

const logger = createLogger('AcceptBuildExtension');

function handleAcceptBuildExtension(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info('Accepting build extension', { buildId, playerIndex });

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

  // Create the finalized extended build
  const extendedBuild = {
    ...pendingBuild,
    // Clear pending state
    isPendingExtension: false,
    pendingExtensionCard: undefined,
    pendingExtensionPlayer: undefined,
    // Apply the extension
    cards: pendingBuild.previewCards,
    value: pendingBuild.previewValue,
    owner: pendingBuild.previewOwner,
    // Recalculate extension eligibility
    isExtendable: pendingBuild.previewCards.length < 5
  };

  // Remove the extension card from player's hand
  const playerHand = gameState.playerHands[playerIndex];
  const extensionCard = pendingBuild.pendingExtensionCard;
  const cardIndex = playerHand.findIndex(card =>
    card.rank === extensionCard.rank && card.suit === extensionCard.suit
  );

  if (cardIndex >= 0) {
    playerHand.splice(cardIndex, 1);
    logger.info('Extension card removed from hand', {
      playerIndex,
      card: `${extensionCard.rank}${extensionCard.suit}`
    });
  }

  // Replace with finalized build
  gameState.tableCards[buildIndex] = extendedBuild;

  // Turn passes to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info('Build extension accepted - finalized', {
    buildId,
    previousOwner: pendingBuild.owner,
    newOwner: playerIndex,
    nextPlayer,
    finalValue: extendedBuild.value,
    cardCount: extendedBuild.cards.length
  });

  return gameState;
}

module.exports = handleAcceptBuildExtension;