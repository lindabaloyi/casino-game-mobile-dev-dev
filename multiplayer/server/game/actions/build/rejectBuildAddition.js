/**
 * Reject Build Addition Action Handler
 * Cancels a pending build addition and returns card to original location
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('RejectBuildAddition');

function handleRejectBuildAddition(gameManager, playerIndex, action) {
  const { buildId } = action.payload;
  const gameState = gameManager.getGameState(action.payload.gameId);

  if (!gameState) {
    throw new Error(`Game ${action.payload.gameId} not found`);
  }

  // Find pending build addition
  const pending = gameState.pendingBuildAdditions?.[buildId];
  if (!pending) {
    throw new Error(`No pending build addition for build ${buildId}`);
  }

  if (pending.playerId !== playerIndex) {
    throw new Error('Player does not own this pending build addition');
  }

  logger.info('Rejecting build addition', {
    buildId,
    playerIndex,
    card: `${pending.card.rank}${pending.card.suit}`,
    source: pending.source,
    wasAdded: pending.added
  });

  // Find target build
  const build = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!build) {
    throw new Error(`Build ${buildId} not found`);
  }

  const newGameState = { ...gameState };

  // If card was already added to build, remove it
  if (pending.added) {
    console.log('[BUILD_REJECT] Removing already-added card from build:', {
      buildId,
      card: `${pending.card.rank}${pending.card.suit}`,
      buildCardCount: build.cards.length
    });

    // Remove card from build
    const cardIndex = build.cards.findIndex(c =>
      c.rank === pending.card.rank && c.suit === pending.card.suit
    );

    if (cardIndex >= 0) {
      build.cards.splice(cardIndex, 1);
      // Update build value
      build.value = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);
      build.lastUpdated = Date.now();
      console.log('[BUILD_REJECT] ✅ Removed card from build, new count:', build.cards.length);
    } else {
      console.warn('[BUILD_REJECT] ⚠️ Card not found in build during rejection');
    }

    // Return card to original source location
    returnCardToSource(newGameState, pending.card, pending.source, playerIndex);
  }

  // Clear pending state
  delete newGameState.pendingBuildAdditions[buildId];

  logger.info('Build addition rejected successfully', {
    buildId,
    card: `${pending.card.rank}${pending.card.suit}`,
    returnedTo: pending.source,
    wasAdded: pending.added
  });

  return newGameState;
}

/**
 * Return card to its original source location
 */
function returnCardToSource(gameState, card, source, playerIndex) {
  console.log('[BUILD_RETURN] Returning card to source:', {
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  if (source === 'hand') {
    // Add card back to player's hand
    if (!gameState.playerHands[playerIndex]) {
      gameState.playerHands[playerIndex] = [];
    }
    gameState.playerHands[playerIndex].push(card);
    console.log('[BUILD_RETURN] ✅ Returned to hand, new hand size:', gameState.playerHands[playerIndex].length);
  } else if (source === 'table') {
    // Add card back to table as loose card
    gameState.tableCards.push(card);
    console.log('[BUILD_RETURN] ✅ Returned to table, new table size:', gameState.tableCards.length);
  } else {
    throw new Error(`Unknown source type for return: ${source}`);
  }
}

module.exports = handleRejectBuildAddition;
