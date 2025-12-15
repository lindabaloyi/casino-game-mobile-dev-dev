/**
 * Hand-to-Table Drop Handler
 * Creates temp stack from hand card + table card
 * Removes card from player's hand
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('HandToTableDrop');

function handleHandToTableDrop(gameManager, playerIndex, action) {
  console.log('[SERVER_CRASH_DEBUG] ===== HANDLER CALLED =====');
  console.log('[SERVER_CRASH_DEBUG] Handler: handToTableDrop');
  console.log('[SERVER_CRASH_DEBUG] playerIndex:', playerIndex);
  console.log('[SERVER_CRASH_DEBUG] action.payload:', JSON.stringify(action.payload, null, 2));

  try {
    console.log('[HANDLER_EXEC] 🏃 HAND_TO_TABLE_DROP executing');
    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

  console.log('[HAND_TO_TABLE] Creating temp stack from hand + table:', {
    gameId,
    playerIndex,
    handCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    tableCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // VALIDATION: Ensure this is hand-to-table
  if (draggedItem.source !== 'hand') {
    console.error('[HAND_TO_TABLE] ERROR: Expected hand source, got:', draggedItem.source);
    throw new Error('HandToTableDrop handler requires hand source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[HAND_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('HandToTableDrop handler requires loose card target');
  }

  // Create temp stack
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

  // SAFE: Remove from player's hand
  if (gameState.playerHands && Array.isArray(gameState.playerHands) && gameState.playerHands[playerIndex]) {
    const originalHandSize = gameState.playerHands[playerIndex].length;
    gameState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(
      card => !(card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit)
    );
    const newHandSize = gameState.playerHands[playerIndex].length;

    console.log('[HAND_TO_TABLE] Hand updated:', {
      originalSize: originalHandSize,
      newSize: newHandSize,
      cardRemoved: `${draggedItem.card.rank}${draggedItem.card.suit}`
    });
  } else {
    console.warn('[HAND_TO_TABLE] Player hand not available for removal:', {
      hasPlayerHands: !!gameState.playerHands,
      isArray: Array.isArray(gameState.playerHands),
      playerIndex,
      handExists: !!(gameState.playerHands?.[playerIndex])
    });
  }

  console.log('[HAND_TO_TABLE] ✅ Temp stack created (hand updated):', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value,
    remainingHandSize: gameState.playerHands?.[playerIndex]?.length || 'unknown'
  });

  return gameState;
  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN handToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

module.exports = handleHandToTableDrop;
