/**
 * Add To Building Action Handler
 * Player adds cards to their owned build (build augmentation)
 * Mimics addToStagingStack but for owned builds
 */

function handleAddToBuilding(gameManager, playerIndex, action, gameId) {
  console.log('[BUILD_AUGMENT] 🏗️ FLEXIBLE BUILD AUGMENTATION', {
    gameId,
    playerIndex,
    actionType: action.type,
    timestamp: Date.now()
  });

  const { buildId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[BUILD_AUGMENT] 📊 Flexible augmentation request:', {
    buildId,
    card: card ? `${card.rank}${card.suit}` : 'NO CARD',
    source,
    playerIndex
  });

  // 🎯 ONLY VALIDATION: Find build and check ownership
  const targetBuild = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!targetBuild) {
    console.log('[BUILD_AUGMENT] ❌ Build not found:', buildId);
    throw new Error('Build not found');
  }

  // ✅ CRITICAL: Only check ownership - allow anything else!
  if (targetBuild.owner !== playerIndex) {
    console.log('[BUILD_AUGMENT] ❌ Not build owner:', {
      buildOwner: targetBuild.owner,
      playerIndex
    });
    throw new Error('You can only augment your own builds');
  }

  console.log('[BUILD_AUGMENT] ✅ Ownership validated - accepting any card');

  // 🎯 CREATE/FIND AUGMENTATION STACK
  const augmentationStackId = `build-augment-${buildId}`;
  let augmentationStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === augmentationStackId
  );

  if (!augmentationStack) {
    console.log('[BUILD_AUGMENT] Creating augmentation stack for flexible building');
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
  }

  // 🎯 ADD CARD TO AUGMENTATION STACK
  console.log('[BUILD_AUGMENT] Adding card to augmentation stack:', {
    stackId: augmentationStack.stackId,
    beforeCount: augmentationStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source
  });

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
  console.log('[BUILD_AUGMENT] Removing card from source:', { source, card: `${card.rank}${card.suit}` });

  try {
    removeCardFromSource(gameState, card, source, playerIndex);
    console.log('[BUILD_AUGMENT] ✅ Card successfully removed from source');
  } catch (error) {
    console.error('[BUILD_AUGMENT] ❌ Failed to remove card from source:', error.message);
    throw error;
  }

  console.log('[BUILD_AUGMENT] ✅ Card added to build augmentation stack:', {
    augmentationStackId: augmentationStack.stackId,
    newCardCount: augmentationStack.cards.length,
    newValue: augmentationStack.value,
    targetBuildValue: targetBuild.value
  });

  return gameState;
}

/**
 * Remove card from its source location
 * Handles hand, captures, and table sources
 */
function removeCardFromSource(gameState, card, source, playerIndex) {
  console.log('[BUILD_AUGMENT] Removing card from source:', {
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
      console.log('[BUILD_AUGMENT] ✅ Removed from hand at index:', handIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's hand`);
    }
  } else if (source === 'table' || source === 'loose') {
    console.log('[BUILD_AUGMENT] Removing loose card from table');
    const cardIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
    if (cardIndex >= 0) {
      gameState.tableCards.splice(cardIndex, 1);
      console.log('[BUILD_AUGMENT] ✅ Removed from table at index:', cardIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found on table`);
    }
  } else if (source === 'captured') {
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
      console.log('[BUILD_AUGMENT] ✅ Removed from captures at index:', captureIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's captures`);
    }
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToBuilding;
