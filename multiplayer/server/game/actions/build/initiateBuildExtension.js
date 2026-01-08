/**
 * Initiate Build Extension Action Handler
 * Visually adds extension card to target build and marks as pending extension
 */

const { createLogger } = require('../../../utils/logger');

const logger = createLogger('InitiateBuildExtension');

function handleInitiateBuildExtension(gameManager, playerIndex, action, gameId) {
  const { extensionCard, targetBuildId } = action.payload;

  logger.info('Initiating build extension - adding card to build visually', {
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

  // Remove the card from player's hand
  const playerHand = gameState.playerHands[playerIndex];
  const cardIndex = playerHand.findIndex(card =>
    card.rank === extensionCard.rank && card.suit === extensionCard.suit
  );

  if (cardIndex === -1) {
    logger.warn('Extension card not found in player hand', {
      playerIndex,
      extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
      hand: playerHand.map(c => `${c.rank}${c.suit}`)
    });
    return gameState;
  }

  // Remove card from hand
  const removedCard = playerHand.splice(cardIndex, 1)[0];
  logger.info('Card removed from player hand for extension', {
    playerIndex,
    removedCard: `${removedCard.rank}${removedCard.suit}`,
    remainingHand: playerHand.length
  });

  // Create a copy of the build with extension card added
  const extendedBuild = {
    ...targetBuild,
    cards: [...targetBuild.cards, extensionCard], // Add extension card to cards array
    value: targetBuild.value + extensionCard.value, // Update build value
    // Mark as pending extension
    isPendingExtension: true,
    pendingExtensionCard: extensionCard,
    originalValue: targetBuild.value, // Store original value for cancellation
    originalCards: [...targetBuild.cards], // Store original cards for cancellation
    extensionDetails: {
      extensionCard: extensionCard,
      newOwner: playerIndex,
      newValue: targetBuild.value + extensionCard.value
    }
  };

  // Replace the original build with the extended version
  gameState.tableCards[targetBuildIndex] = extendedBuild;

  logger.info('Build extension initiated - card moved from hand to build', {
    buildId: targetBuild.buildId,
    playerIndex,
    originalCardCount: targetBuild.cards.length,
    extendedCardCount: extendedBuild.cards.length,
    originalValue: targetBuild.value,
    newValue: extendedBuild.value,
    extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
    newOwner: playerIndex,
    handSize: playerHand.length
  });

  return gameState;
}

module.exports = handleInitiateBuildExtension;

