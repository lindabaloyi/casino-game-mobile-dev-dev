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
        return handleTwoLooseCards(gameState, draggedItem, targetInfo, playerIndex, logger, gameId);

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
function handleTwoLooseCards(gameState, draggedItem, targetInfo, playerIndex, logger, gameId) {
  logger.info('Case 1: Creating temp stack from two loose cards');

  // === TEMP CREATION DEBUG ===
  console.log('=== TEMP CREATION DEBUG ===');
  console.log('BEFORE - Full table state:');
  gameState.tableCards.forEach((item, idx) => {
    const type = item.type || 'loose';
    const cardStr = item.cards
      ? `BUILD: ${item.cards.map(c => c.rank + c.suit).join('+')}`
      : `${item.rank}${item.suit}`;
    console.log(`  [${idx}] ${cardStr} (${type})`);
  });

  console.log('DRAG OPERATION:');
  console.log(`  Dragging index ${draggedItem.originalIndex}: ${draggedItem.card.rank}${draggedItem.card.suit}`);
  console.log(`  Onto index ${targetInfo.index}: ${targetInfo.card.rank}${targetInfo.card.suit}`);

  // FIX THE BUG: Ensure we're not finding the same card twice
  const indicesToRemove = [];
  let foundDraggedCard = false;
  let foundTargetCard = false;

  // Find cards to remove - CAREFULLY check each card
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    // Only process loose cards for this case
    if (tableItem.type && tableItem.type !== 'loose') {
      continue;
    }

    // Convert both cards to comparable format
    const draggedStr = `${draggedItem.card.rank}${draggedItem.card.suit}`;
    const targetStr = `${targetInfo.card.rank}${targetInfo.card.suit}`;
    const tableStr = `${tableItem.rank}${tableItem.suit}`;

    // Check for dragged card
    if (!foundDraggedCard && tableStr === draggedStr) {
      indicesToRemove.push(i);
      foundDraggedCard = true;
      continue; // Important: prevent matching same card twice
    }

    // Check for target card
    if (!foundTargetCard && tableStr === targetStr) {
      indicesToRemove.push(i);
      foundTargetCard = true;
      continue;
    }
  }

  console.log('APPROACH 2 CORRECTED: Remove cards with BIG INDEX FIRST rule');
  console.log('INDICES TO REMOVE:', {
    draggedIndex: draggedItem.originalIndex,
    targetIndex: targetInfo.index,
    willRemove: indicesToRemove.sort((a,b) => a-b)
  });

  // Validate we found exactly 2 DIFFERENT cards
  if (indicesToRemove.length !== 2) {
    logger.error('Table-to-table validation failed', {
      found: indicesToRemove.length,
      expected: 2,
      draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
      isSameCard: `${draggedItem.card.rank}${draggedItem.card.suit}` ===
                  `${targetInfo.card.rank}${targetInfo.card.suit}`
    });
    throw new Error(`Expected 2 different loose cards, found ${indicesToRemove.length}`);
  }

  // APPROACH 2 CORRECTED: Remove from highest to lowest (big number first)
  const indicesToRemoveSorted = indicesToRemove.sort((a, b) => b - a); // Highest first
  console.log(`Removing indices in order: ${indicesToRemoveSorted.join(', ')} (highest first)`);

  // Remove from highest to lowest to avoid index shifting issues
  indicesToRemoveSorted.forEach(idx => {
    const card = gameState.tableCards[idx];
    console.log(`  Removing index ${idx}: ${card.rank}${card.suit}`);
    gameState.tableCards.splice(idx, 1);
  });

  // APPROACH 2 CORRECTED: Create temp stack and add to END of array
  const { orderCardsBigToSmall } = require('../../GameState');
  const stackId = `temp-${Date.now()}`;
  const [bottomCard, topCard] = orderCardsBigToSmall(targetInfo.card, draggedItem.card);

  const playerHasBuilds = gameState.tableCards.some(tc =>
    tc && tc.type === 'build' && tc.owner === playerIndex
  );

  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [bottomCard, topCard],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0),
    canAugmentBuilds: playerHasBuilds
  };

  // Add temp stack to the END of the array (not at target index)
  gameState.tableCards.push(tempStack);

  console.log('AFTER FIX - Final table state:');
  console.log(`  Temp stack added at end (index ${gameState.tableCards.length - 1})`);
  gameState.tableCards.forEach((item, idx) => {
    if (item && item.type === 'temporary_stack') {
      console.log(`  [${idx}] TEMP: ${item.cards.map(c => c.rank + c.suit).join('+')} (value: ${item.value})`);
    } else if (item) {
      console.log(`  [${idx}] ${item.rank}${item.suit} (loose)`);
    } else {
      console.log(`  [${idx}] null (should not happen)`);
    }
  });
  console.log('=== TEMP CREATION DEBUG END ===');

  logger.action('END tableToTableDrop (two loose)', gameId, playerIndex, {
    success: true,
    stackId,
    stackValue: tempStack.value
  });

  return gameState;
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
