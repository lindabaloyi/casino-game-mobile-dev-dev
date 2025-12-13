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

  logger.info('[STAGING_CANCEL] Starting staging stack cancellation', {
    playerIndex,
    stackId: stackToCancel.stackId,
    gameId,
    currentPlayer: gameState.currentPlayer,
    isPlayerTurn: playerIndex === gameState.currentPlayer
  });

  logger.debug('[STAGING_CANCEL] Stack to cancel details', {
    stackOwner: stackToCancel.owner,
    stackCards: stackToCancel.cards?.map(c => `${c.rank}${c.suit}(${c.source})`) || [],
    stackValue: stackToCancel.value
  });

  // Find the temp stack to cancel
  logger.debug('[STAGING_CANCEL] Searching for temporary stack on table', {
    searchingStackId: stackToCancel.stackId,
    tableCardsCount: gameState.tableCards.length,
    tableTempStacks: gameState.tableCards.filter(card =>
      card.type === 'temporary_stack'
    ).map(s => ({
      stackId: s.stackId,
      owner: s.owner
    }))
  });

  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stackToCancel.stackId
  );

  if (stackIndex === -1) {
    logger.error('[STAGING_CANCEL] Temporary stack not found - aborting', {
      requestedStackId: stackToCancel.stackId,
      availableStacks: gameState.tableCards.filter(card =>
        card.type === 'temporary_stack'
      ).map(s => s.stackId)
    });
    throw new Error('Temporary stack not found');
  }

  const tempStack = gameState.tableCards[stackIndex];
  const reversedCards = tempStack.cards.slice().reverse(); // Reverse to maintain drag order

  logger.info('[STAGING_CANCEL] Temporary stack found - preparing to cancel', {
    stackIndex,
    stackId: tempStack.stackId,
    originalCardCount: tempStack.cards.length,
    reversedCardOrder: reversedCards.map(c => `${c.rank}${c.suit}`)
  });

  // Remove the temp stack from table and add loose cards
  const tableCardsBefore = gameState.tableCards.length;
  const newTableCards = [...gameState.tableCards];
  newTableCards.splice(stackIndex, 1); // Remove temp stack

  logger.debug('[STAGING_CANCEL] Removed temp stack, now adding back loose cards', {
    tableCardsBeforeRemoval: tableCardsBefore,
    tableCardsAfterRemoval: newTableCards.length,
    cardsToRestore: reversedCards.length
  });

  // Add cards back as loose cards (reversed order gives visual appearance of returning to positions)
  reversedCards.forEach((card, index) => {
    const cleanCard = { rank: card.rank, suit: card.suit, value: card.value };
    if (!cleanCard.type) cleanCard.type = 'loose';

    newTableCards.push(cleanCard);

    logger.debug(`[STAGING_CANCEL] Restored card ${index + 1}/${reversedCards.length}`, {
      card: `${cleanCard.rank}${cleanCard.suit}`,
      type: cleanCard.type,
      tableCardsNow: newTableCards.length
    });
  });

  logger.info('[STAGING_CANCEL] ✅ Staging stack canceled successfully', {
    stackId: stackToCancel.stackId,
    cardsReturned: reversedCards.length,
    tableCardsBefore: tableCardsBefore,
    tableCardsAfter: newTableCards.length,
    turnNotAdvanced: true // Note: Turn does NOT advance when canceling
  });

  logger.debug('[STAGING_CANCEL] Final table state after cancellation', {
    tableCards: newTableCards.map((card, idx) => ({
      index: idx,
      type: card.type || 'loose',
      card: `${card.rank}${card.suit}`
    }))
  });

  return {
    ...gameState,
    tableCards: newTableCards
    // Note: Turn does NOT advance when canceling
  };
}

module.exports = handleCancelStagingStack;
