/**
 * Hand-to-Table Drop Handler
 * Creates temp stack from hand card + table card
 * Removes card from player's hand
 */

function handleHandToTableDrop(gameManager, playerIndex, action) {
    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);
  // ✅ DELEGATE: Use centralized temp stack creation from createTemp.js
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
