// cardRemovers.js - Card removal logic for different sources
const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateTempCardRemovers');

/**
 * Main entry point for card removal by source
 * Returns updated game state with cards removed AND temp stack added (for table source)
 */
function removeCardsBySource(gameState, playerIndex, source, draggedCard, targetCard, targetIndex, payload) {
  logger.info('Removing cards by source', {
    source,
    playerIndex,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    targetIndex
  });

  // Deep copy to avoid mutations
  const newState = JSON.parse(JSON.stringify(gameState));
  const { stagingStack } = payload;

  switch(source) {
    case 'hand':
      removeFromHand(newState, draggedCard, playerIndex);
      replaceTargetWithTempStack(newState, targetIndex, stagingStack);
      break;

    case 'table':
      return handleTableSource(newState, draggedCard, targetCard, targetIndex, stagingStack);

    case 'oppTopCard':
      removeFromOpponentCaptures(newState, payload.opponentId);
      replaceTargetWithTempStack(newState, targetIndex, stagingStack);
      break;

    case 'capturedTopCard':
      removeFromPlayerCaptures(newState, playerIndex);
      replaceTargetWithTempStack(newState, targetIndex, stagingStack);
      break;

    default:
      throw new Error(`Unsupported source: ${source}`);
  }

  logger.info('Card removal complete', {
    source,
    cardsRemoved: 1,
    tableCardsCount: newState.tableCards.length
  });

  return newState;
}

/**
 * Handle table source - most complex case
 * Removes both cards and adds temp stack in correct position
 */
function handleTableSource(gameState, draggedCard, targetCard, targetIndex, stagingStack) {
  logger.info('Processing table source removal', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    targetIndex,
    tableCardsCount: gameState.tableCards.length
  });

  let adjustedTargetIndex = targetIndex;
  let tableCards = [...gameState.tableCards];

  // Find and remove dragged card (excluding target)
  const draggedIndex = tableCards.findIndex((card, index) =>
    index !== targetIndex && card.rank === draggedCard.rank && card.suit === draggedCard.suit
  );

  if (draggedIndex === -1) {
    throw new Error(`Dragged table card ${draggedCard.rank}${draggedCard.suit} not found`);
  }

  // Remove dragged card
  tableCards.splice(draggedIndex, 1);
  logger.info('Removed dragged card', { draggedIndex });

  // Adjust target index if needed
  if (draggedIndex < adjustedTargetIndex) {
    adjustedTargetIndex--;
    logger.info('Adjusted target index', {
      original: targetIndex,
      adjusted: adjustedTargetIndex
    });
  }

  // Replace target card with temp stack
  tableCards.splice(adjustedTargetIndex, 1, stagingStack);
  gameState.tableCards = tableCards;

  logger.info('Table source complete', {
    newTableCardsCount: gameState.tableCards.length,
    stackAdded: stagingStack.stackId
  });

  return gameState;
}

/**
 * Remove dragged card from player's hand
 */
function removeFromHand(gameState, draggedCard, playerIndex) {
  const beforeCount = gameState.playerHands[playerIndex].length;

  gameState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(card =>
    !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
  );

  const afterCount = gameState.playerHands[playerIndex].length;

  if (beforeCount === afterCount) {
    throw new Error(`Card ${draggedCard.rank}${draggedCard.suit} not found in hand`);
  }

  logger.info('Hand card removed', {
    playerIndex,
    card: `${draggedCard.rank}${draggedCard.suit}`,
    handSize: afterCount
  });
}

/**
 * Remove top card from opponent's captures
 */
function removeFromOpponentCaptures(gameState, opponentId) {
  const captures = gameState.playerCaptures[opponentId] || [];

  if (captures.length === 0) {
    throw new Error(`Opponent ${opponentId} has no captured cards`);
  }

  gameState.playerCaptures[opponentId] = captures.slice(0, -1);

  logger.info('Opponent top card removed', {
    opponentId,
    remainingCaptures: gameState.playerCaptures[opponentId].length
  });
}

/**
 * Remove top card from player's own captures
 */
function removeFromPlayerCaptures(gameState, playerIndex) {
  const captures = gameState.playerCaptures[playerIndex] || [];

  if (captures.length === 0) {
    throw new Error(`Player ${playerIndex} has no captured cards`);
  }

  gameState.playerCaptures[playerIndex] = captures.slice(0, -1);

  logger.info('Player top captured card removed', {
    playerIndex,
    remainingCaptures: gameState.playerCaptures[playerIndex].length
  });
}

/**
 * Replace target card with temp stack (for non-table sources)
 */
function replaceTargetWithTempStack(gameState, targetIndex, stagingStack) {
  if (!gameState.tableCards || targetIndex >= gameState.tableCards.length) {
    throw new Error(`Invalid target index ${targetIndex} for table replacement`);
  }

  gameState.tableCards[targetIndex] = stagingStack;

  logger.info('Target card replaced with temp stack', {
    targetIndex,
    stackId: stagingStack.stackId
  });
}

module.exports = {
  removeCardsBySource,
  removeFromHand,
  handleTableSource,
  removeFromOpponentCaptures,
  removeFromPlayerCaptures,
  replaceTargetWithTempStack
};