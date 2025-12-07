/**
 * Cancel Trail Action Handler
 * Cancels a trail action that was declined by the player
 * Returns the game state unchanged (no-op)
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('CancelTrailAction');

/**
 * Cancel trail action - returns current game state unchanged
 */
function handleCancelTrail(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  logger.info('Player cancelled trail action', {
    playerIndex,
    gameId,
    cancelledCard: action.payload?.card?.rank + action.payload?.card?.suit
  });

  // Return the current game state unchanged
  // This is a no-op action that effectively cancels the trail
  return gameState;
}

module.exports = handleCancelTrail;
