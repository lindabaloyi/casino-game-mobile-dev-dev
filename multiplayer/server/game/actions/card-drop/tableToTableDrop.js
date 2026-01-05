/**
 * Enhanced Table-to-Table Drop Handler
 * Handles multiple cases:
 * 1. Two loose cards → temp stack
 * 2. Loose card + temp stack → add to stack
 * 3. Loose card + our own build → augment build
 */

function handleTableToTableDrop(gameManager, playerIndex, action, gameId) {
  // Simple inline logger to avoid module resolution issues
  const logger = {
    debug: (...args) => console.debug('[tableToTableDrop]', ...args),
    info: (...args) => console.log('[tableToTableDrop]', ...args),
    warn: (...args) => console.warn('[tableToTableDrop]', ...args),
    error: (...args) => console.error('[tableToTableDrop]', ...args),
    action: (type, gameId, playerIndex, data = {}) => console.log(`[${new Date().toISOString()}] [ACTION] ${type} | Game:${gameId} | Player:${playerIndex}`, data)
  };

  logger.action('START tableToTableDrop', gameId, playerIndex, {
    draggedCard: action.payload.draggedItem?.card ?
      `${action.payload.draggedItem.card.rank}${action.payload.draggedItem.card.suit}` : 'none',
    targetCard: action.payload.targetInfo?.card ?
      `${action.payload.targetInfo.card.rank}${action.payload.targetInfo.card.suit}` : 'none',
    targetType: action.payload.targetInfo?.type
  });

  try {
    const { draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

    // 1. VALIDATE SOURCE IS TABLE CARD
    if (draggedItem.source !== 'table' && draggedItem.source !== 'loose') {
      console.error('[TABLE_TO_TABLE] ERROR: Expected table source, got:', draggedItem.source);
      throw new Error('TableToTableDrop handler requires table source');
    }

    // 2. IDENTIFY THE TARGET TYPE AND HANDLE ACCORDINGLY
    const targetType = targetInfo.type;

    switch (targetType) {
      case 'loose':
        // CASE 1: Two loose cards → create temp stack
        return handleTwoLooseCards(gameManager, gameState, draggedItem, targetInfo, playerIndex, logger, gameId);

      case 'temporary_stack':
        // CASE 2: Loose card + temp stack → add to existing stack
        return handleAddToTempStack(gameState, draggedItem, targetInfo, playerIndex, logger, gameId);

      case 'build':
        // CASE 3: Loose card + build → augment build (if allowed)
        return handleAugmentBuild(gameState, draggedItem, targetInfo, playerIndex, logger, gameId);

      default:
        throw new Error(`Unsupported target type for table-to-table drop: ${targetType}`);
    }

  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN tableToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

// ==================== CASE 1: TWO LOOSE CARDS ====================
function handleTwoLooseCards(gameManager, gameState, draggedItem, targetInfo, playerIndex, logger, gameId) {
  logger.info('Case 1: Creating temp stack from two loose cards via createTemp');

  // ✅ DELEGATE: Use centralized temp stack creation from createTemp.js
  const { handleCreateTemp } = require('../temp/createTemp');

  // Create action payload for createTemp
  const createTempAction = {
    payload: {
      source: 'table',  // Both cards are from table
      card: draggedItem.card,
      targetIndex: targetInfo.index,
      isTableToTable: true
    }
  };

  // Use createTemp to handle the creation
  const newGameState = handleCreateTemp(gameManager, playerIndex, createTempAction, gameId);

  logger.action('END tableToTableDrop (two loose via createTemp)', gameId, playerIndex, {
    success: true,
    delegatedToCreateTemp: true
  });

  return newGameState;
}

// ==================== CASE 2: ADD TO TEMP STACK ====================
function handleAddToTempStack(gameState, draggedItem, targetInfo, playerIndex, logger, gameId) {
  logger.info('Case 2: Adding loose card to existing temp stack');

  // Find and remove the dragged loose card
  let draggedCardIndex = -1;
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    if (tableItem.type === 'loose' || !tableItem.type) {
      const draggedStr = `${draggedItem.card.rank}${draggedItem.card.suit}`;
      const tableStr = `${tableItem.rank}${tableItem.suit}`;

      if (tableStr === draggedStr) {
        draggedCardIndex = i;
        break;
      }
    }
  }

  if (draggedCardIndex === -1) {
    throw new Error('Could not find dragged loose card on table');
  }

  // Remove the loose card
  const [removedCard] = gameState.tableCards.splice(draggedCardIndex, 1);

  // Find the temp stack
  const stackIndex = gameState.tableCards.findIndex(tc =>
    tc.type === 'temporary_stack' && tc.stackId === targetInfo.stackId
  );

  if (stackIndex === -1) {
    throw new Error('Target temp stack not found');
  }

  // Add card to temp stack (on top)
  const tempStack = gameState.tableCards[stackIndex];
  tempStack.cards.push(removedCard);
  tempStack.value += (removedCard.value || 0);

  logger.action('END tableToTableDrop (add to stack)', gameId, playerIndex, {
    success: true,
    stackId: tempStack.stackId,
    newValue: tempStack.value,
    cardsCount: tempStack.cards.length
  });

  return gameState;
}

// ==================== CASE 3: AUGMENT OUR OWN BUILD ====================
function handleAugmentBuild(gameState, draggedItem, targetInfo, playerIndex, logger, gameId) {
  logger.info('Case 3: Adding card to our own build (augmentation)');

  // Validate the build belongs to the player
  if (targetInfo.owner !== playerIndex) {
    throw new Error('Cannot augment opponent\'s build');
  }

  // Validate build is not complete
  if (targetInfo.isComplete) {
    throw new Error('Cannot augment a complete build');
  }

  // Find and remove the dragged loose card
  let draggedCardIndex = -1;
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    if (tableItem.type === 'loose' || !tableItem.type) {
      const draggedStr = `${draggedItem.card.rank}${draggedItem.card.suit}`;
      const tableStr = `${tableItem.rank}${tableItem.suit}`;

      if (tableStr === draggedStr) {
        draggedCardIndex = i;
        break;
      }
    }
  }

  if (draggedCardIndex === -1) {
    throw new Error('Could not find dragged loose card on table');
  }

  // Remove the loose card
  const [removedCard] = gameState.tableCards.splice(draggedCardIndex, 1);

  // Find the build
  const buildIndex = gameState.tableCards.findIndex(tc =>
    tc.type === 'build' && tc.buildId === targetInfo.buildId
  );

  if (buildIndex === -1) {
    throw new Error('Target build not found');
  }

  // Add card to build
  const build = gameState.tableCards[buildIndex];
  build.cards.push(removedCard);
  build.value += (removedCard.value || 0);

  // Check if build is now complete (e.g., reached target value)
  const isComplete = checkBuildComplete(build);
  if (isComplete) {
    build.isComplete = true;
    logger.info(`Build ${build.buildId} is now complete!`);
  }

  logger.action('END tableToTableDrop (augment build)', gameId, playerIndex, {
    success: true,
    buildId: build.buildId,
    newValue: build.value,
    isComplete: build.isComplete || false
  });

  return gameState;
}

// Helper function to check if build is complete
function checkBuildComplete(build) {
  // Your build completion logic here
  // For example: build reaches specific target value
  const TARGET_VALUE = 15; // Example: Casino build target
  return build.value === TARGET_VALUE;
}

module.exports = handleTableToTableDrop;
