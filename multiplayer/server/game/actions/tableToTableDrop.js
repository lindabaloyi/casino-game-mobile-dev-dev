/**
 * Table-to-Table Drop Handler
 * Creates temp stack from TWO table cards
 * NO hand logic - assumes both cards are from table
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('TableToTableDrop');

function handleTableToTableDrop(gameManager, playerIndex, action) {
  console.log('[SERVER_CRASH_DEBUG] ===== HANDLER CALLED =====');
  console.log('[SERVER_CRASH_DEBUG] Handler: tableToTableDrop');
  console.log('[SERVER_CRASH_DEBUG] playerIndex:', playerIndex);
  console.log('[SERVER_CRASH_DEBUG] action.payload:', JSON.stringify(action.payload, null, 2));

  try {
    console.log('[HANDLER_EXEC] 🏃 TABLE_TO_TABLE_DROP executing');
    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

  console.log('[TABLE_TO_TABLE] Creating temp stack from table cards:', {
    gameId,
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // VALIDATION: Ensure this is table-to-table
  if (draggedItem.source !== 'table') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected table source, got:', draggedItem.source);
    throw new Error('TableToTableDrop handler requires table source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('TableToTableDrop handler requires loose card target');
  }

  // SIMPLE: Create temp stack (no hand logic)
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  // Add to table
  gameState.tableCards.push(tempStack);

  console.log('[TABLE_TO_TABLE] ✅ Temp stack created:', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value
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
