/**
 * Add To Opponent Build Action Handler
 * Player adds to opponent's build
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('AddToOpponentBuild');

function handleAddToOpponentBuild(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedItem, buildToAddTo } = action.payload;

  logger.info('Extending opponent build', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    buildId: buildToAddTo.buildId,
    fromValue: buildToAddTo.value,
    gameId
  });

  // Find build and verify it's opponent's
  const buildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === buildToAddTo.buildId && card.owner !== playerIndex
  );

  if (buildIndex === -1) {
    throw new Error("Opponent build not found");
  }

  // Remove card from hand
  const playerHand = gameState.playerHands[playerIndex];
  const handIndex = playerHand.findIndex(c =>
    c.rank === draggedItem.card.rank && c.suit === draggedItem.card.suit
  );

  if (handIndex === -1) {
    throw new Error("Card not found in hand");
  }

  const addedCard = playerHand.splice(handIndex, 1)[0];
  const newBuildValue = buildToAddTo.value + addedCard.value;

  if (newBuildValue > 10) {
    throw new Error("Build value would exceed 10");
  }

  // Extend build
  const extendedBuild = {
    ...buildToAddTo,
    value: newBuildValue,
    cards: [...buildToAddTo.cards, addedCard]
  };

  const newGameState = {
    ...gameState,
    playerHands: gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? playerHand : hand
    ),
    tableCards: gameState.tableCards.map((card, idx) =>
      idx === buildIndex ? extendedBuild : card
    )
  };

  logger.info('Opponent build extended successfully', {
    buildId: extendedBuild.buildId,
    newValue: newBuildValue,
    addedCard: `${addedCard.rank}${addedCard.suit}`
  });

  return newGameState;
}

module.exports = handleAddToOpponentBuild;
