/**
 * Create Build From Temp Stack Action Handler
 * Player creates a permanent build from temp stack (ends turn)
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('CreateBuildFromTempStack');

function handleCreateBuildFromTempStack(gameManager, playerIndex, action, gameId) {
  const { tempStackId, buildValue, buildCard } = action.payload;

  logger.info('Creating build from temp stack', {
    tempStackId,
    buildValue,
    buildCard: buildCard ? `${buildCard.rank}${buildCard.suit}` : 'none',
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  // Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    logger.warn('Temp stack not found', { tempStackId });
    return gameState; // Return unchanged state
  }

  const tempStack = gameState.tableCards[tempStackIndex];

  // For builds, no additional card is needed from hand
  // The temp stack itself becomes the build
  if (buildCard) {
    // Verify player has the build card and remove it (legacy support)
    const playerHand = gameState.playerHands[playerIndex] || [];
    const buildCardIndex = playerHand.findIndex(card =>
      card.rank === buildCard.rank && card.suit === buildCard.suit
    );

    if (buildCardIndex === -1) {
      logger.warn('Build card not found in hand', {
        buildCard: `${buildCard.rank}${buildCard.suit}`,
        handSize: playerHand.length
      });
      return gameState;
    }

    // Remove build card from hand
    gameState.playerHands[playerIndex].splice(buildCardIndex, 1);
  }

  // Remove temp stack from table
  const tempStackCards = tempStack.cards || [];
  gameState.tableCards.splice(tempStackIndex, 1);

  // Create permanent build
  const buildCards = buildCard ? [...tempStackCards, buildCard] : [...tempStackCards];
  const build = {
    type: 'build',
    buildId: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: buildCards,
    value: buildValue,
    owner: playerIndex,
    isExtendable: true
  };

  // Add build to table
  gameState.tableCards.push(build);

  logger.info('Build created from temp stack', {
    buildId: build.buildId,
    value: buildValue,
    cardCount: build.cards.length,
    playerIndex,
    // Turn ends (like capture)
  });

  return gameState;
}

module.exports = handleCreateBuildFromTempStack;
