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

  // 🔍 DEBUG: Pre-execution state
  console.log('[SERVER_DEBUG] PRE-EXECUTION STATE:', {
    gameId: action.payload.gameId,
    playerIndex,
    draggedCard: action.payload.draggedItem?.card ? `${action.payload.draggedItem.card.rank}${action.payload.draggedItem.card.suit}` : 'none',
    targetCard: action.payload.targetInfo?.card ? `${action.payload.targetInfo.card.rank}${action.payload.targetInfo.card.suit}` : 'none'
  });

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

  // ✅ FIXED: Remove original cards before creating temp stack
  console.log('[TEMP_STACK] Removing original cards before creating temp stack');

  // 🔍 CRITICAL DEBUG: Table structure analysis
  console.log('[DEBUG] Table items analysis:', {
    totalItems: gameState.tableCards.length,
    items: gameState.tableCards.map((item, i) => ({
      index: i,
      type: item.type || 'loose',
      hasRank: 'rank' in item,
      rank: item.rank,
      suit: item.suit,
      isTempStack: item.type === 'temporary_stack',
      tempStackCards: item.type === 'temporary_stack' ? item.cards?.length : 'N/A'
    }))
  });

  const indicesToRemove = [];

  // 🔥 FIXED LOOP: Only check loose cards, skip temp stacks
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    // ✅ CRITICAL: Skip temp stacks and builds
    if (tableItem.type && tableItem.type !== 'loose') {
      console.log(`[DEBUG] Skipping ${tableItem.type} at index ${i}`);
      continue;
    }

    // Now safe to check rank/suit
    const isDraggedCard = tableItem.rank === draggedItem.card.rank &&
                          tableItem.suit === draggedItem.card.suit;
    const isTargetCard = tableItem.rank === targetInfo.card.rank &&
                          tableItem.suit === targetInfo.card.suit;

    if (isDraggedCard && !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
      console.log(`[DEBUG] Found dragged card ${tableItem.rank}${tableItem.suit} at index ${i}`);
    }

    if (isTargetCard && !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
      console.log(`[DEBUG] Found target card ${tableItem.rank}${tableItem.suit} at index ${i}`);
    }
  }

  console.log('[TEMP_STACK] Card indices to remove:', {
    indicesToRemove,
    count: indicesToRemove.length,
    expectedCount: 2,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
  });

  // 🔥 CRITICAL VALIDATION: Must find exactly 2 loose cards
  if (indicesToRemove.length !== 2) {
    console.error('[TEMP_STACK] ❌ CRITICAL: Expected to remove 2 loose cards, found', indicesToRemove.length);
    throw new Error(`Table-to-table drop: Expected 2 cards to remove, found ${indicesToRemove.length}`);
  }

  // Remove cards in reverse order to maintain indices
  indicesToRemove.sort((a, b) => b - a).forEach(index => {
    console.log(`[TEMP_STACK] Removing card at index ${index}:`, gameState.tableCards[index]);
    gameState.tableCards.splice(index, 1);
  });

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
