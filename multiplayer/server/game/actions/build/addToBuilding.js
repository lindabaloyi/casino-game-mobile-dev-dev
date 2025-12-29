/**
 * Add To Building Action Handler
 * Player adds cards to their owned build (build augmentation)
 * Mimics addToStagingStack but for owned builds
 */

function handleAddToBuilding(gameManager, playerIndex, action, gameId) {
  console.log('[FUNCTION] 🚀 ENTERING handleAddToBuilding', {
    gameId,
    playerIndex,
    actionType: action.type,
    timestamp: Date.now()
  });
  console.log('[BUILD_AUGMENT] 🏗️ ADD_TO_BUILDING executing');
  console.log('[BUILD_AUGMENT] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { buildId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[BUILD_AUGMENT] 📊 Operation details:', {
    gameId,
    buildId,
    card: card ? `${card.rank}${card.suit}` : 'INVALID CARD',
    cardValue: card?.value,
    source,
    playerIndex,
    tableCardsCount: gameState.tableCards?.length || 0,
    buildsInTable: gameState.tableCards?.filter(c => c.type === 'build').length || 0
  });

  // 🎯 VALIDATE INPUT
  if (!card) {
    console.error('[BUILD_AUGMENT] ❌ No card provided in payload');
    throw new Error('Card data is required');
  }

  if (!buildId) {
    console.error('[BUILD_AUGMENT] ❌ No buildId provided in payload');
    throw new Error('Build ID is required');
  }

  // 🎯 FIRST: Find the target build
  console.log('[BUILD_AUGMENT] 🔍 Searching for build:', { buildId });
  const targetBuild = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!targetBuild) {
    console.log('[BUILD_AUGMENT] ❌ Build not found:', {
      buildId,
      availableBuilds: gameState.tableCards
        .filter(c => c.type === 'build')
        .map(b => ({ id: b.buildId, owner: b.owner, value: b.value }))
    });
    throw new Error('Build not found');
  }

  console.log('[BUILD_AUGMENT] ✅ Found target build:', {
    buildId: targetBuild.buildId,
    buildOwner: targetBuild.owner,
    buildValue: targetBuild.value,
    buildCardsCount: targetBuild.cards?.length || 0
  });

  // 🎯 OWNERSHIP CHECK: Only build owner can augment
  if (targetBuild.owner !== playerIndex) {
    console.log('[BUILD_AUGMENT] ❌ Not build owner:', {
      buildOwner: targetBuild.owner,
      playerIndex,
      buildId: targetBuild.buildId
    });
    throw new Error('You can only augment your own builds');
  }

  // 🎯 FIND OR CREATE BUILD AUGMENTATION STACK
  // Use different ID format to distinguish from temp stacks
  const augmentationStackId = `build-augment-${buildId}`;
  let augmentationStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === augmentationStackId
  );

  if (!augmentationStack) {
    console.log('[BUILD_AUGMENT] Creating new build augmentation stack:', {
      augmentationStackId,
      buildId,
      playerIndex
    });

    augmentationStack = {
      type: 'temporary_stack',
      stackId: augmentationStackId,
      cards: [],
      owner: playerIndex,
      value: 0,
      createdAt: Date.now(),
      // Special markers for build augmentation
      isBuildAugmentation: true,
      targetBuildId: buildId,
      targetBuildValue: targetBuild.value
    };
    gameState.tableCards.push(augmentationStack);
  }

  // ✅ PHASE 1: NO EARLY VALIDATION - Just add cards freely
  // Validation happens in Phase 2 when player clicks "Accept"
  console.log('[BUILD_AUGMENT] ✅ PHASE 1: Adding card without validation');

  // 🎯 VALIDATION: Sum must equal build value when finalized
  // Allow any combination during building phase, validate on finalize
  console.log('[BUILD_AUGMENT] 🎯 Skipping validation during building phase');

  // Basic sanity checks
  if (!card || !card.rank || !card.suit) {
    console.error('[BUILD_AUGMENT] ❌ Invalid card data');
    throw new Error('Invalid card data');
  }

  if (!source) {
    console.error('[BUILD_AUGMENT] ❌ Card source not specified');
    throw new Error('Card source not specified');
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
