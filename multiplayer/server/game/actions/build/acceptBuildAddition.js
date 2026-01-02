/**
 * Accept Build Addition Action Handler
 * Immediately adds a pending card to a build (like addToStagingStack logic)
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('AcceptBuildAddition');

function handleAcceptBuildAddition(gameManager, playerIndex, action) {
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

  logger.info('Accepting build addition', {
    buildId,
    playerIndex,
    card: `${pending.card.rank}${pending.card.suit}`,
    source: pending.source
  });

  // Find target build
  const build = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!build) {
    throw new Error(`Build ${buildId} not found`);
  }

  // IMMEDIATE ADDITION LOGIC (like addToStagingStack)
  console.log('[BUILD_ACCEPT] Adding card to build immediately:', {
    buildId,
    card: `${pending.card.rank}${pending.card.suit}`,
    source: pending.source,
    beforeCount: build.cards.length
  });

  // Add card to build
  build.cards.push({
    ...pending.card,
    source: pending.source,
    addedAt: Date.now()
  });

  // Update build value
  build.value = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  build.lastUpdated = Date.now();

  // Remove card from source
  removeCardFromSource(gameState, pending.card, pending.source, playerIndex);

  // Clear pending state
  const newGameState = { ...gameState };
  delete newGameState.pendingBuildAdditions[buildId];

  logger.info('Build addition accepted successfully', {
    buildId,
    newCardCount: build.cards.length,
    newValue: build.value,
    remainingHand: gameState.playerHands[playerIndex]?.length || 0
  });

  return newGameState;
}

/**
 * Remove card from its source location
 */
function removeCardFromSource(gameState, card, source, playerIndex) {
  console.log('[BUILD_SOURCE_REMOVAL] Removing card from source:', {
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      console.log('[BUILD_SOURCE_REMOVAL] ✅ Removed from hand at index:', handIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's hand`);
    }
  } else if (source === 'table') {
    const cardIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
    if (cardIndex >= 0) {
      gameState.tableCards.splice(cardIndex, 1);
      console.log('[BUILD_SOURCE_REMOVAL] ✅ Removed from table at index:', cardIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found on table`);
    }
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAcceptBuildAddition;
