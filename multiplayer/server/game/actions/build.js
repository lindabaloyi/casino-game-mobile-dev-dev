/**
 * Build Action Handler
 * Player creates a build with a hand card and table card
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('BuildAction');

function handleBuild(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedItem, tableCardsInBuild, buildValue, biggerCard, smallerCard } = action.payload;

  logger.info('Creating build', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    buildValue,
    gameId
  });

  // Find and remove dragged card from player's hand
  const playerHand = gameState.playerHands[playerIndex];
  const cardIndex = playerHand.findIndex(c =>
    c.rank === draggedItem.card.rank && c.suit === draggedItem.card.suit
  );

  if (cardIndex === -1) {
    throw new Error("Card not found in hand.");
  }

  // Create updated game state
  const newGameState = { ...gameState };

  // Remove card from hand
  const buildCard = playerHand.splice(cardIndex, 1)[0];
  newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
    idx === playerIndex ? playerHand : hand
  );

  // Create build object
  const build = {
    type: 'build',
    value: buildValue,
    cards: [biggerCard, smallerCard],
    owner: playerIndex,
    buildId: `build-${Date.now()}`
  };

  // Remove table card that is part of the build
  let updatedTableCards = [...gameState.tableCards];
  tableCardsInBuild.forEach(tableCard => {
    updatedTableCards = updatedTableCards.filter(tc => {
      if (!tc.type || tc.type === 'loose') {
        return !(tc.rank === tableCard.rank && tc.suit === tableCard.suit);
      }
      return true;
    });
  });

  // Add build to table
  updatedTableCards.push(build);
  newGameState.tableCards = updatedTableCards;

  logger.info('Build created successfully', {
    buildId: build.buildId,
    value: buildValue,
    owner: playerIndex,
    tableCardsAfter: updatedTableCards.length
  });

  return newGameState;
}

module.exports = handleBuild;
