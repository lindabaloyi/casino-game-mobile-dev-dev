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
    console.log('[TEMP_STACK] 🏃 TABLE_TO_TABLE_DROP executing');
    console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

    console.log('[TEMP_STACK] Game state before operation:', {
      gameId,
      currentPlayer: gameState.currentPlayer,
      tableCardsCount: gameState.tableCards?.length || 0,
      tableCards: gameState.tableCards?.map((card, index) => ({
        index,
        type: card?.type || 'loose',
        card: card ? `${card.rank || 'no-rank'}${card.suit || 'no-suit'}` : 'null',
        value: card?.value || (card?.rank ? require('../GameState').rankValue(card.rank) : 'n/a'),
        owner: card?.owner
      })) || []
    });

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

  // ✅ OPTIMIZED: Remove original cards before creating temp stack (single-pass)
  console.log('[TEMP_STACK] Removing original cards before creating temp stack');

  // Single-pass optimization: collect indices to remove in one iteration
  const indicesToRemove = [];

  for (let i = 0; i < gameState.tableCards.length; i++) {
    const card = gameState.tableCards[i];

    // Check for dragged card
    if (card.rank === draggedItem.card.rank &&
        card.suit === draggedItem.card.suit &&
        !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
    }

    // Check for target card (could be same index if same card!)
    if (card.rank === targetInfo.card.rank &&
        card.suit === targetInfo.card.suit &&
        !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
    }
  }

  console.log('[TEMP_STACK] Card indices to remove:', {
    indicesToRemove,
    count: indicesToRemove.length,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
  });

  // Enhanced edge case handling: prevent removing same card twice
  if (indicesToRemove.length === 1) {
    // Only one unique card found (dragged and target are same) - remove it once
    console.log(`[TEMP_STACK] Edge case: removing same card once at index ${indicesToRemove[0]}`);
    gameState.tableCards.splice(indicesToRemove[0], 1);
  } else if (indicesToRemove.length === 2) {
    // Two different cards - remove both in reverse order
    indicesToRemove.sort((a, b) => b - a).forEach(index => {
      console.log(`[TEMP_STACK] Removing card at index ${index}:`, gameState.tableCards[index]);
      gameState.tableCards.splice(index, 1);
    });
  } else {
    console.warn('[TEMP_STACK] Unexpected: found', indicesToRemove.length, 'indices to remove');
  }

  console.log('[TEMP_STACK] Game state after removing originals:', {
    remainingCards: gameState.tableCards.length,
    remainingCardDetails: gameState.tableCards.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      card: card ? `${card.rank || 'no-rank'}${card.suit || 'no-suit'}` : 'null'
    }))
  });

  // ✅ NOW: Create temp stack with the removed cards
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  console.log('[TEMP_STACK] Created temp stack:', {
    stackId,
    cardsInStack: tempStack.cards.length,
    totalValue: tempStack.value,
    owner: tempStack.owner
  });

  // ✅ Add temp stack to table (replacing the original cards)
  gameState.tableCards.push(tempStack);

  console.log('[TEMP_STACK] Final game state:', {
    totalCards: gameState.tableCards.length,
    cardDetails: gameState.tableCards.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      stackId: card?.stackId,
      cardCount: card?.cards?.length || 1,
      description: card?.type === 'temporary_stack'
        ? `temp-stack: ${card.stackId} (${card.cards.length} cards)`
        : `loose: ${card.rank}${card.suit}`
    }))
  });

  console.log('[TABLE_TO_TABLE] ✅ Temp stack created:', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value
  });

  // Final validation: ensure no duplicates after operation
  const { validateNoDuplicates } = require('../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    console.error('[TABLE_TO_TABLE] ❌ CRITICAL: Duplicates detected after temp stack creation!');
    // Don't throw - let the game continue but log the issue
  }

  return gameState;
  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN tableToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

module.exports = handleTableToTableDrop;
