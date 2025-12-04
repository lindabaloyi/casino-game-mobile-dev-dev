/**
 * Cancel Staging Stack Action Handler
 * Player cancels temporary stack, returning cards to original positions
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('CancelStagingStack');

function handleCancelStagingStack(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { stackToCancel } = action.payload;

  logger.info('Canceling staging stack', {
    playerIndex,
    stackId: stackToCancel.stackId,
    gameId
  });

  // Find the temp stack to cancel
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stackToCancel.stackId
  );

  if (stackIndex === -1) {
    throw new Error('Temporary stack not found');
  }

  const tempStack = gameState.tableCards[stackIndex];
  const reversedCards = tempStack.cards.slice().reverse(); // Reverse to maintain drag order

  // Remove the temp stack from table and add loose cards
  const newTableCards = [...gameState.tableCards];
  newTableCards.splice(stackIndex, 1); // Remove temp stack

  // Add cards back as loose cards (reversed order gives visual appearance of returning to positions)
  reversedCards.forEach(card => {
    const cleanCard = { rank: card.rank, suit: card.suit, value: card.value };
    if (!cleanCard.type) cleanCard.type = 'loose';
    newTableCards.push(cleanCard);
  });

  logger.info('Staging stack canceled successfully', {
    stackId: stackToCancel.stackId,
    cardsReturned: reversedCards.length,
    newTableCount: newTableCards.length
  });

  return {
    ...gameState,
    tableCards: newTableCards
    // Note: Turn does NOT advance when canceling
  };
}

module.exports = handleCancelStagingStack;
