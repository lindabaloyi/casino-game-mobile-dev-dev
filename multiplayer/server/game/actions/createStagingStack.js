/**
 * Create Staging Stack Action Handler
 * Player creates staging stack by dropping hand card on loose table card
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('CreateStagingStack');

function handleCreateStagingStack(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { handCard, tableCard } = action.payload;

  logger.info('Creating staging stack', {
    playerIndex,
    handCard: `${handCard.rank}${handCard.suit}`,
    tableCard: `${tableCard.rank}${tableCard.suit}`,
    gameId
  });

  // Validate hand card exists in player's hand
  const playerHand = gameState.playerHands[playerIndex];
  const handExists = playerHand.some(card =>
    card.rank === handCard.rank && card.suit === handCard.suit
  );

  if (!handExists) {
    const error = new Error("Hand card not found.");
    logger.error('Staging stack creation failed - hand card not in hand', { playerIndex, handCard });
    throw error;
  }

  // Validate table card exists on table
  const tableCardExists = gameState.tableCards.some(card =>
    (!card.type || card.type === 'loose') && card.rank === tableCard.rank && card.suit === tableCard.suit
  );

  if (!tableCardExists) {
    const error = new Error("Target table card not found.");
    logger.error('Staging stack creation failed - table card not found', { tableCard });
    throw error;
  }

  // Check that player doesn't already have a staging stack
  const hasStagingStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (hasStagingStack) {
    const error = new Error("You can only have one staging stack at a time.");
    logger.error('Staging stack creation failed - player already has staging stack', { playerIndex });
    throw error;
  }

  // Create staging stack
  const stagingStack = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: [
      { ...handCard, source: 'hand' },
      { ...tableCard, source: 'table' }
    ],
    owner: playerIndex,
    value: handCard.value + tableCard.value,
    possibleBuilds: [handCard.value + tableCard.value]
  };

  const newGameState = { ...gameState };

  // Remove hand card from player's hand
  newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
    idx === playerIndex ? hand.filter(card =>
      !(card.rank === handCard.rank && card.suit === handCard.suit)
    ) : hand
  );

  // Replace table card with staging stack
  const tableCardIndex = gameState.tableCards.findIndex(card =>
    (!card.type || card.type === 'loose') && card.rank === tableCard.rank && card.suit === tableCard.suit
  );

  newGameState.tableCards = [...gameState.tableCards];
  newGameState.tableCards.splice(tableCardIndex, 1, stagingStack);

  logger.info('Staging stack created successfully', {
    stackId: stagingStack.stackId,
    value: stagingStack.value,
    tableCardsCount: newGameState.tableCards.length
  });

  return newGameState;
}

module.exports = handleCreateStagingStack;
