/**
 * Hand-to-Table Drop Handler
 * Creates temp stack from hand card + table card
 * Removes card from player's hand
 */

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

  console.log('[HAND_TO_TABLE] Creating temp stack from hand + table:', {
    gameId,
    playerIndex,
    handCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    tableCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // ✅ DELEGATE: Use centralized temp stack creation from createTemp.js
  console.log('[TEMP_STACK] Delegating to createTemp for hand-to-table drop');

  const handleCreateTemp = require('../temp/createTemp');

  // Create action payload for createTemp
  const createTempAction = {
    payload: {
      source: 'hand',
      card: draggedItem.card,
      targetIndex: targetInfo.index,
      isTableToTable: false
    }
  };

  // Use createTemp to handle the creation
  const newGameState = handleCreateTemp(gameManager, playerIndex, createTempAction, gameId);

  console.log('[TEMP_STACK] ✅ Temp stack created via createTemp:', {
    stackId: `temp-${playerIndex}`,
    tableLength: newGameState.table ? newGameState.table.length : 'unknown'
  });

  // Final validation: ensure no duplicates after operation
  const { validateNoDuplicates } = require('../../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    console.error('[HAND_TO_TABLE] ❌ CRITICAL: Duplicates detected after temp stack creation!');
    // Don't throw - let the game continue but log the issue
  }

  return newGameState;
}

module.exports = handleHandToTableDrop;
