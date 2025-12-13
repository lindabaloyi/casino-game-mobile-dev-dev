/**
 * Trail Action Handler
 * Player places a card on the table instead of capturing
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('TrailAction');

function handleTrail(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }
  const { card } = action.payload;

  console.log(`TRAIL: P${playerIndex + 1} trails ${card.rank}${card.suit} (game ${gameId})`);

  // Find and remove card from player's hand
  const playerHand = gameState.playerHands[playerIndex];
  const cardIndex = playerHand.findIndex(c =>
    c.rank === card.rank && c.suit === card.suit
  );

  if (cardIndex === -1) {
    const handCards = playerHand.map(c => `${c.rank}${c.suit}`).join(', ');
    throw new Error(`Card ${card.rank}${card.suit} not in P${playerIndex + 1}'s hand. Hand: [${handCards}]`);
  }

  const newGameState = { ...gameState };

  // Remove card from hand
  const trailedCard = playerHand.splice(cardIndex, 1)[0];
  newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
    idx === playerIndex ? playerHand : hand
  );

  // Add to table as loose card
  newGameState.tableCards = [
    ...gameState.tableCards,
    trailedCard
  ];

  logger.info('Trail completed', {
    card: `${trailedCard.rank}${trailedCard.suit}`,
    tableCount: newGameState.tableCards.length
  });

  return newGameState;
}

module.exports = handleTrail;
