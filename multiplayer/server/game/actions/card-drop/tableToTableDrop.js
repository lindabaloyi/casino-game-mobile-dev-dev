/**
 * Table-to-Table Drop Handler
 * Creates temp stack from TWO table cards
 * NO hand logic - assumes both cards are from table
 */



function handleTableToTableDrop(gameManager, playerIndex, action, gameId) {
  const { createLogger } = require('../../utils/logger');
  const logger = createLogger('tableToTableDrop');
  logger.action('START tableToTableDrop', gameId, playerIndex, {
    draggedCard: action.payload.draggedItem?.card ? `${action.payload.draggedItem.card.rank}${action.payload.draggedItem.card.suit}` : 'none',
    targetCard: action.payload.targetInfo?.card ? `${action.payload.targetInfo.card.rank}${action.payload.targetInfo.card.suit}` : 'none'
  });

  try {
    const { draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

  // VALIDATION: Ensure this is table-to-table (accepts both 'table' and 'loose' sources)
  if (draggedItem.source !== 'table' && draggedItem.source !== 'loose') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected table source, got:', draggedItem.source);
    throw new Error('TableToTableDrop handler requires table source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('TableToTableDrop handler requires loose card target');
  }

  // Remove original cards before creating temp stack

  const indicesToRemove = [];

  // Find cards to remove
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    // Skip temp stacks and builds
    if (tableItem.type && tableItem.type !== 'loose') {
      continue;
    }

    const isDraggedCard = tableItem.rank === draggedItem.card.rank &&
                          tableItem.suit === draggedItem.card.suit;
    const isTargetCard = tableItem.rank === targetInfo.card.rank &&
                          tableItem.suit === targetInfo.card.suit;

    if ((isDraggedCard || isTargetCard) && !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
    }
  }

  // Validate we found exactly 2 cards
  if (indicesToRemove.length !== 2) {
    logger.error('Table-to-table validation failed', {
      found: indicesToRemove.length,
      expected: 2,
      draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
    });
    throw new Error(`Table-to-table drop: Expected 2 cards to remove, found ${indicesToRemove.length}`);
  }

  // Remove cards in reverse order to maintain indices
  indicesToRemove.sort((a, b) => b - a).forEach(index => {
    gameState.tableCards.splice(index, 1);
  });

  // ✅ Create temp stack with ordered cards: bigger at bottom
  const { orderCardsBigToSmall } = require('../../GameState');
  const stackId = `temp-${Date.now()}`;

  // Order: bigger card at bottom, smaller card on top
  const [bottomCard, topCard] = orderCardsBigToSmall(targetInfo.card, draggedItem.card);

  // Check if player has active builds for augmentation capability
  const playerHasBuilds = gameState.tableCards.some(tc =>
    tc.type === 'build' && tc.owner === playerIndex
  );

  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [bottomCard, topCard],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0),
    canAugmentBuilds: playerHasBuilds
  };

  // Add temp stack to table
  gameState.tableCards.push(tempStack);

  // Final validation: ensure no duplicates after operation
  const { validateNoDuplicates } = require('../../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    logger.error('Duplicates detected after temp stack creation');
  }

  logger.action('END tableToTableDrop', gameId, playerIndex, {
    success: true,
    stackId,
    stackValue: tempStack.value,
    canAugmentBuilds: tempStack.canAugmentBuilds
  });

  return gameState;
  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN tableToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

module.exports = handleTableToTableDrop;
