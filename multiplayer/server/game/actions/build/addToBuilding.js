/**
 * Add To Building Action Handler
 * Player adds cards to their owned build (build augmentation)
 * Mimics addToStagingStack but for owned builds
 */

function handleAddToBuilding(gameManager, playerIndex, action, gameId) {
  const { createLogger } = require('../../../utils/logger');
  const logger = createLogger('addToBuilding');
  logger.action('START addToBuilding', gameId, playerIndex, action.payload);

  const { buildId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  logger.info(`[addToBuilding] Received action with payload: ${JSON.stringify(action.payload)}`);

  // 🎯 ONLY VALIDATION: Find build and check ownership
  const targetBuild = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!targetBuild) {
    logger.error(`[addToBuilding] Build not found: ${buildId}`);
    throw new Error('Build not found');
  }
  logger.info(`[addToBuilding] Found target build: ${targetBuild.buildId}`);


  // ✅ CRITICAL: Only check ownership - allow anything else!
  if (targetBuild.owner !== playerIndex) {
    logger.error(`[addToBuilding] Not build owner. Owner: ${targetBuild.owner}, Player: ${playerIndex}`);
    throw new Error('You can only augment your own builds');
  }
  logger.info(`[addToBuilding] Ownership validated for player ${playerIndex}`);


  // 🎯 CREATE/FIND AUGMENTATION STACK
  const augmentationStackId = `build-augment-${buildId}`;
  let augmentationStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === augmentationStackId
  );

  if (!augmentationStack) {
    logger.info(`[addToBuilding] No existing augmentation stack found. Creating new one with id: ${augmentationStackId}`);
    augmentationStack = {
      type: 'temporary_stack',
      stackId: augmentationStackId,
      cards: [],
      owner: playerIndex,
      value: 0,
      createdAt: Date.now(),
      isBuildAugmentation: true,
      targetBuildId: buildId,
      targetBuildValue: targetBuild.value
    };
    gameState.tableCards.push(augmentationStack);
  } else {
    logger.info(`[addToBuilding] Found existing augmentation stack with id: ${augmentationStackId}`);
  }

  // 🎯 ADD CARD TO AUGMENTATION STACK
  logger.info(`[addToBuilding] Adding card ${card.rank}${card.suit} to augmentation stack.`);

  // Initialize cardPositions if needed
  if (!augmentationStack.cardPositions) {
    augmentationStack.cardPositions = [];
    augmentationStack.cards.forEach((existingCard, index) => {
      augmentationStack.cardPositions.push({
        cardId: `${existingCard.rank}${existingCard.suit}`,
        originalIndex: null,
        source: existingCard.source || 'unknown'
      });
    });
  }

  augmentationStack.cards.push({
    ...card,
    source: source || 'unknown',
    addedAt: Date.now(),
    addedBy: playerIndex
  });

  // Track position
  let originalIndex = null;
  if (source === 'table' || source === 'loose') {
    originalIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
  }

  augmentationStack.cardPositions.push({
    cardId: `${card.rank}${card.suit}`,
    originalIndex: originalIndex,
    source: source || 'unknown'
  });

  // Update stack value
  augmentationStack.value = augmentationStack.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  augmentationStack.lastUpdated = Date.now();

  // 🎯 REMOVE CARD FROM SOURCE
  logger.info(`[addToBuilding] Removing card ${card.rank}${card.suit} from source: ${source}`);

  try {
    removeCardFromSource(gameState, card, source, playerIndex, logger);
    logger.info('[addToBuilding] Card successfully removed from source');
  } catch (error) {
    logger.error(`[addToBuilding] Failed to remove card from source: ${error.message}`);
    throw error;
  }

  logger.action('END addToBuilding', gameId, playerIndex, { success: true });

  return gameState;
}

/**
 * Remove card from its source location
 * Handles hand, captures, and table sources
 */
function removeCardFromSource(gameState, card, source, playerIndex, logger) {
  logger.info(`[removeCardFromSource] Attempting to remove ${card.rank}${card.suit} from ${source}`);

  if (source === 'hand') {
    const hand = gameState.playerHands[playerIndex];
    const handIndex = hand.findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      hand.splice(handIndex, 1);
      logger.info(`[removeCardFromSource] Removed from hand at index: ${handIndex}`);
    } else {
      logger.error(`[removeCardFromSource] Card not found in player's hand. Hand: ${JSON.stringify(hand)}`);
      throw new Error(`Card ${card.rank}${card.suit} not found in player's hand`);
    }
  } else if (source === 'table' || source === 'loose') {
    const tableCards = gameState.tableCards;
    const cardIndex = tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
    if (cardIndex >= 0) {
        tableCards.splice(cardIndex, 1);
        logger.info(`[removeCardFromSource] Removed from table at index: ${cardIndex}`);
    } else {
      logger.error(`[removeCardFromSource] Loose card not found on table. Table: ${JSON.stringify(tableCards)}`);
      throw new Error(`Card ${card.rank}${card.suit} not found on table`);
    }
  } else if (source === 'captured') {
    const captures = gameState.playerCaptures[playerIndex];
    const captureIndex = captures.findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      captures.splice(captureIndex, 1);
      logger.info(`[removeCardFromSource] Removed from captures at index: ${captureIndex}`);
    } else {
      logger.error(`[removeCardFromSource] Card not found in player's captures. Captures: ${JSON.stringify(captures)}`);
      throw new Error(`Card ${card.rank}${card.suit} not found in player's captures`);
    }
  } else {
    logger.error(`[removeCardFromSource] Unknown source type: ${source}`);
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToBuilding;
