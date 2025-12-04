/**
 * Table Card Drop Action Handler
 * Player drops table card onto another table card to create staging stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('TableCardDrop');

function handleTableCardDrop(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { draggedCard, targetCard } = action.payload;

  logger.info('Dropping table card on table card', {
    playerIndex,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    gameId
  });

  // Casino rule: Players can only have one temp stack active at a time
  const alreadyHasTempStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (alreadyHasTempStack) {
    throw new Error('You can only have one staging stack at a time.');
  }

  // Find both cards in the table
  const draggedIndex = gameState.tableCards.findIndex(card =>
    (!card.type || card.type === 'loose') &&
    card.rank === draggedCard.rank &&
    card.suit === draggedCard.suit
  );

  const targetIndex = gameState.tableCards.findIndex(card =>
    (!card.type || card.type === 'loose') &&
    card.rank === targetCard.rank &&
    card.suit === targetCard.suit
  );

  if (draggedIndex === -1 || targetIndex === -1) {
    throw new Error('Required table cards not found');
  }

  // Create temporary stack object
  const tempStack = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: [targetCard, draggedCard], // Target first, then dragged
    owner: playerIndex,
    value: targetCard.value + draggedCard.value,
    stackControls: true // Enable finalize/cancel buttons
  };

  // Replace target card with temp stack and remove dragged card
  const newTableCards = [...gameState.tableCards];
  newTableCards[targetIndex] = tempStack; // Replace target with stack
  newTableCards.splice(draggedIndex, 1); // Remove dragged card

  const newGameState = {
    ...gameState,
    tableCards: newTableCards
  };

  logger.info('Temp stack created from table card drop', {
    stackId: tempStack.stackId,
    value: tempStack.value,
    owner: playerIndex,
    tableCardsRemaining: newTableCards.length
  });

  return newGameState;
}

module.exports = handleTableCardDrop;
