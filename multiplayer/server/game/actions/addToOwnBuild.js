/**
 * Add To Own Build Action Handler
 * Player adds to their own build
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToOwnBuild');

function handleAddToOwnBuild(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedItem, buildToAddTo } = action.payload;

  logger.info('Adding to own build', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    buildId: buildToAddTo.buildId,
    fromValue: buildToAddTo.value,
    gameId
  });

  // Find build and verify it's player's
  const buildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === buildToAddTo.buildId && card.owner === playerIndex
  );

  if (buildIndex === -1) {
    throw new Error("Own build not found");
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

  logger.info('Own build extended successfully', {
    buildId: extendedBuild.buildId,
    newValue: newBuildValue,
    addedCard: `${addedCard.rank}${addedCard.suit}`
  });

  return newGameState;
}

module.exports = handleAddToOwnBuild;
