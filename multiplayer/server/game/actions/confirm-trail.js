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

  const cardInfo = action.payload?.card ? `${action.payload.card.rank}${action.payload.card.suit}` : 'unknown';

  logger.info('Player confirmed trail action', {
    playerIndex,
    gameId: action.payload?.gameId,
    card: cardInfo,
    actionPayload: JSON.stringify(action.payload, null, 2)
  });

  // Get game state to verify player hand before creating trail action
  const gameState = gameManager.getGameState(action.payload?.gameId);
  if (!gameState) {
    logger.error('Game not found in confirm-trail', { gameId: action.payload?.gameId });
    throw new Error(`Game ${action.payload?.gameId} not found`);
  }

  const playerHand = gameState.playerHands[playerIndex];
  logger.debug('Confirm-trail - player hand check', {
    playerIndex,
    handSize: playerHand.length,
    handCards: playerHand.map(c => `${c.rank}${c.suit}`),
    cardToTrail: cardInfo
  });

  // Create proper trail action structure for the handler
  const trailAction = {
    payload: {
      gameId: action.payload.gameId,
      card: action.payload.card
    }
  };

  logger.info('Calling trail handler with structured payload', {
    trailActionPayload: JSON.stringify(trailAction.payload, null, 2)
  });

  // Call the regular trail handler with the same logic
  return trailHandler(gameManager, playerIndex, trailAction);
}

module.exports = handleConfirmTrail;
