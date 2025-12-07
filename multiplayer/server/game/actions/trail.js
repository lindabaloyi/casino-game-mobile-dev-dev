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

  logger.info('Trailed card', { playerIndex, card: `${card.rank}${card.suit}`, gameId });

  // Find and remove card from player's hand
  const playerHand = gameState.playerHands[playerIndex];

  // Debug: Log hand contents
  logger.debug('Player hand contents', {
    playerIndex,
    handSize: playerHand.length,
    handCards: playerHand.map(c => `${c.rank}${c.suit}`),
    searchingFor: `${card.rank}${card.suit}`
  });

  const cardIndex = playerHand.findIndex(c =>
    c.rank === card.rank && c.suit === card.suit
  );

  if (cardIndex === -1) {
    const error = new Error(`Card not found in hand: ${card.rank}${card.suit}`);
    logger.error('Trail failed - card not in hand', {
      playerIndex,
      card: card,
      gameId,
      handCards: playerHand.map(c => ({ rank: c.rank, suit: c.suit }))
    });
    throw error;
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
    { ...trailedCard, type: 'loose' }
  ];

  logger.info('Trail completed', {
    card: `${trailedCard.rank}${trailedCard.suit}`,
    tableCount: newGameState.tableCards.length
  });

  return newGameState;
}

module.exports = handleTrail;
