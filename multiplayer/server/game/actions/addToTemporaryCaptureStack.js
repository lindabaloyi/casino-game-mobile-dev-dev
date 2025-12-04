/**
 * Add To Temporary Capture Stack Action Handler
 * Stub implementation - this action was not used in the original code
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToTemporaryCaptureStack');

function handleAddToTemporaryCaptureStack(gameManager, playerIndex, action) {
  const { gameId } = action.payload;

  logger.info('AddToTemporaryCaptureStack action called (stub)', {
    playerIndex,
    gameId
  });

  // This action was not used in the original code - return unchanged state
  const gameState = gameManager.getGameState(gameId);
  logger.warn('This action is not implemented and was not used in original code', {
    gameId,
    playerIndex
  });

  return gameState;
}

module.exports = handleAddToTemporaryCaptureStack;
