/**
 * Confirm Trail Action Handler
 * Confirms and executes a trail action that was approved by the player
 */

const { createLogger } = require('../../../utils/logger');

/**
 * Execute trail action (same as regular trail but confirmed by player)
 */
function handleConfirmTrail(gameManager, playerIndex, action) {
  const trailHandler = require('./index');

  const cardInfo = action.payload?.card ? `${action.payload.card.rank}${action.payload.card.suit}` : 'unknown';
  console.log(`CONFIRM_TRAIL: P${playerIndex + 1} confirms ${cardInfo} (game ${action.payload?.gameId})`);

  // Verify game exists
  const gameState = gameManager.getGameState(action.payload?.gameId);
  if (!gameState) {
    throw new Error(`Game ${action.payload?.gameId} not found`);
  }

  // Create structured payload for trail handler
  const trailAction = {
    payload: {
      gameId: action.payload.gameId,
      card: action.payload.card
    }
  };

  return trailHandler(gameManager, playerIndex, trailAction);
}

module.exports = handleConfirmTrail;
