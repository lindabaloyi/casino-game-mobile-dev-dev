/**
 * Add To Own Build Action Handler
 * Player adds to their own build
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('AddToOwnBuild');

function handleAddToOwnBuild(gameManager, playerIndex, action, gameIdFromRouter) {
  // Handle both payload gameId (from card-drop) and parameter gameId (from game-action)
  const gameId = gameIdFromRouter || action.payload.gameId;
  console.log('[BUILD_PENDING] addToOwnBuild called - creating pending state:', {
    gameId,
    playerIndex,
    actionType: action.type,
    payloadKeys: Object.keys(action.payload),
    timestamp: new Date().toISOString()
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Handle both payload structures:
  // 1. From build drop handlers: { buildId, card, source }
  // 2. From contact handler: { draggedItem: { card, source }, buildToAddTo: build }
  let buildId, card, source, build;

  if (action.payload.buildId) {
    // Structure from build drop handlers
    ({ buildId, card, source } = action.payload);
    // Find build
    build = gameState.tableCards.find(item =>
      item.type === 'build' && item.buildId === buildId && item.owner === playerIndex
    );
  } else {
    // Structure from contact handler
    ({ draggedItem: { card, source }, buildToAddTo: build } = action.payload);
    buildId = build.buildId;
  }

  console.log('[BUILD_PENDING] Creating pending build addition:', {
    buildId,
    card: card ? `${card.rank}${card.suit}` : 'undefined',
    source,
    playerIndex,
    payloadStructure: action.payload.buildId ? 'drop-handler' : 'contact-handler'
  });

  if (!card) {
    throw new Error('Card is undefined in addToOwnBuild payload');
  }

  logger.info('Creating pending build addition', {
    playerIndex,
    card: `${card.rank}${card.suit}`,
    source,
    buildId,
    gameId
  });

  // Verify build ownership (for contact handler structure, we already have the build)
  if (!build) {
    build = gameState.tableCards.find(item =>
      item.type === 'build' && item.buildId === buildId && item.owner === playerIndex
    );
  }

  if (!build) {
    throw new Error("Own build not found");
  }

  // IMMEDIATE ADDITION: Add card to build right away (fits like a glove)
  console.log('[BUILD_IMMEDIATE] Immediately adding card to build:', {
    buildId,
    card: `${card.rank}${card.suit}`,
    buildCardCount: build.cards.length,
    newValue: build.value + (card.value || 0)
  });

  build.cards.push({
    ...card,
    source,
    addedAt: Date.now()
  });

  // Update build value
  build.value = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  build.lastUpdated = Date.now();

  // Remove card from source
  removeCardFromSource(gameState, card, source, playerIndex);

  // Create pending state for cancel option
  const newGameState = { ...gameState };
  newGameState.pendingBuildAdditions = {
    ...gameState.pendingBuildAdditions,
    [buildId]: {
      card,
      source,
      playerId: playerIndex,
      added: true, // Mark as already added to build
      timestamp: Date.now()
    }
  };

  logger.info('Pending build addition created', {
    buildId,
    card: `${card.rank}${card.suit}`,
    pendingAdditions: Object.keys(newGameState.pendingBuildAdditions || {})
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

module.exports = handleAddToOwnBuild;
