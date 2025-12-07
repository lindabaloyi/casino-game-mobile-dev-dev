/**
 * Confirm Trail Action Handler
 * Confirms and executes a trail action that was approved by the player
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('ConfirmTrailAction');

/**
 * Execute trail action (same as regular trail but confirmed by player)
 */
function handleConfirmTrail(gameManager, playerIndex, action) {
  // Re-use the existing trail logic but with player confirmation
  const trailHandler = require('./trail');

  logger.info('Player confirmed trail action', {
    playerIndex,
    gameId: action.payload?.gameId
  });

  // Call the regular trail handler with the same logic
  return trailHandler(gameManager, playerIndex, action);
}

module.exports = handleConfirmTrail;
