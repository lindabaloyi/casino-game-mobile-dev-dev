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
    console.log('[TEMP_STACK] 🏃 HAND_TO_TABLE_DROP executing');
    console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

    console.log('[TEMP_STACK] Game state before operation:', {
      gameId,
      currentPlayer: gameState.currentPlayer,
      playerIndex,
      playerHandSize: gameState.playerHands?.[playerIndex]?.length || 0,
      playerHand: gameState.playerHands?.[playerIndex]?.map(card => `${card.rank}${card.suit}`) || [],
      tableCardsCount: gameState.tableCards?.length || 0,
      tableCards: gameState.tableCards?.map((card, index) => ({
        index,
        type: card?.type || 'loose',
        card: card ? `${card.rank || 'no-rank'}${card.suit || 'no-suit'}` : 'null',
        value: card?.value || (card?.rank ? require('../GameState').rankValue(card.rank) : 'n/a'),
        owner: card?.owner
      })) || []
    });

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

  // ✅ FIX: Remove target card from table before creating temp stack
  console.log('[TEMP_STACK] Removing target card from table before creating temp stack');

  const targetCardIndex = gameState.tableCards.findIndex(card =>
    card.rank === targetInfo.card.rank && card.suit === targetInfo.card.suit
  );

  console.log('[TEMP_STACK] Target card index to remove:', {
    targetCardIndex,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
  });

  if (targetCardIndex >= 0) {
    console.log(`[TEMP_STACK] Removing target card at index ${targetCardIndex}:`, gameState.tableCards[targetCardIndex]);
    gameState.tableCards.splice(targetCardIndex, 1);
  } else {
    console.warn('[TEMP_STACK] Target card not found on table for removal');
  }

  console.log('[TEMP_STACK] Game state after removing target card:', {
    remainingTableCards: gameState.tableCards.length,
    remainingTableCardDetails: gameState.tableCards.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      card: card ? `${card.rank || 'no-rank'}${card.suit || 'no-suit'}` : 'null'
    }))
  });

  // ✅ Create temp stack with hand card + removed table card
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  console.log('[TEMP_STACK] Created temp stack (hand + table):', {
    stackId,
    cardsInStack: tempStack.cards.length,
    totalValue: tempStack.value,
    owner: tempStack.owner
  });

  // ✅ Add temp stack to table
  gameState.tableCards.push(tempStack);

  // ✅ Remove from player's hand
  if (gameState.playerHands && Array.isArray(gameState.playerHands) && gameState.playerHands[playerIndex]) {
    const originalHandSize = gameState.playerHands[playerIndex].length;
    gameState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(
      card => !(card.rank === draggedItem.card.rank && card.suit === draggedItem.card.suit)
    );
    const newHandSize = gameState.playerHands[playerIndex].length;

    console.log('[TEMP_STACK] Hand updated:', {
      originalSize: originalHandSize,
      newSize: newHandSize,
      cardRemoved: `${draggedItem.card.rank}${draggedItem.card.suit}`
    });
  } else {
    console.warn('[TEMP_STACK] Player hand not available for removal:', {
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

  // Final validation: ensure no duplicates after operation
  const { validateNoDuplicates } = require('../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    console.error('[HAND_TO_TABLE] ❌ CRITICAL: Duplicates detected after temp stack creation!');
    // Don't throw - let the game continue but log the issue
  }

  return gameState;
  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN handToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

module.exports = handleHandToTableDrop;
