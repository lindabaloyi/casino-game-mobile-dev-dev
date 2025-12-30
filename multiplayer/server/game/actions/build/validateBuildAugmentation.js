/**
 * Validate Build Augmentation Action Handler
 * Phase 2: Validates build augmentation when player clicks "Accept"
 * Handles both single card captures and multi-card augmentations
 */

function handleValidateBuildAugmentation(gameManager, playerIndex, action, gameId) {
  console.log('[FUNCTION] 🚀 ENTERING handleValidateBuildAugmentation', {
    gameId,
    playerIndex,
    actionType: action.type,
    timestamp: Date.now()
  });
  console.log('[BUILD_VALIDATE] ✅ PHASE 2: VALIDATE_BUILD_AUGMENTATION executing');
  console.log('[BUILD_VALIDATE] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { buildId, tempStackId } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[BUILD_VALIDATE] 📊 Validation details:', {
    gameId,
    buildId,
    tempStackId,
    playerIndex
  });

  // 🎯 VALIDATE INPUT
  if (!buildId) {
    console.error('[BUILD_VALIDATE] ❌ No buildId provided in payload');
    throw new Error('Build ID is required');
  }

  // 🎯 FIND TARGET BUILD
  console.log('[BUILD_VALIDATE] 🔍 Finding target build:', { buildId });
  const targetBuild = gameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (!targetBuild) {
    console.log('[BUILD_VALIDATE] ❌ Build not found:', { buildId });
    throw new Error('Build not found');
  }

  console.log('[BUILD_VALIDATE] ✅ Found target build:', {
    buildId: targetBuild.buildId,
    buildOwner: targetBuild.owner,
    buildValue: targetBuild.value,
    buildCardsCount: targetBuild.cards?.length || 0
  });

  // 🎯 OWNERSHIP CHECK: Only build owner can validate
  if (targetBuild.owner !== playerIndex) {
    console.log('[BUILD_VALIDATE] ❌ Not build owner:', {
      buildOwner: targetBuild.owner,
      playerIndex,
      buildId: targetBuild.buildId
    });
    throw new Error('You can only validate your own build augmentations');
  }

  // 🎯 FIND AUGMENTATION STACK (using the provided tempStackId)
  if (!tempStackId) {
    console.error('[BUILD_VALIDATE] ❌ No tempStackId provided in payload');
    throw new Error('Temp stack ID is required');
  }

  const augmentationStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === tempStackId
  );

  if (!augmentationStack) {
    console.log('[BUILD_VALIDATE] ❌ No augmentation stack found:', { tempStackId });
    throw new Error('No cards added to build for validation');
  }

  console.log('[BUILD_VALIDATE] ✅ Found augmentation stack:', {
    stackId: augmentationStack.stackId,
    cardCount: augmentationStack.cards.length,
    currentValue: augmentationStack.value,
    targetBuildValue: targetBuild.value
  });

  // ✅ PHASE 2: VALIDATE ENTIRE COMBINATION
  const cardCount = augmentationStack.cards.length;

  if (cardCount === 1) {
    // 🎯 SINGLE CARD: Check for CAPTURE
    console.log('[BUILD_VALIDATE] 🎯 SINGLE CARD: Checking for capture');
    const singleCard = augmentationStack.cards[0];

    if (singleCard.value === targetBuild.value) {
      console.log('[BUILD_VALIDATE] ✅ CAPTURE: Single card matches build value');
      return captureBuild(gameState, playerIndex, targetBuild, singleCard, augmentationStack);
    } else {
      console.log('[BUILD_VALIDATE] ❌ INVALID CAPTURE: Single card value mismatch', {
        cardValue: singleCard.value,
        buildValue: targetBuild.value
      });
      throw new Error(`Single card must match build value ${targetBuild.value} for capture`);
    }
  } else {
    // 🎯 MULTIPLE CARDS: Check for AUGMENTATION
    console.log('[BUILD_VALIDATE] 🎯 MULTIPLE CARDS: Checking for augmentation');
    const totalValue = augmentationStack.value;

    if (totalValue === targetBuild.value) {
      console.log('[BUILD_VALIDATE] ✅ VALID AUGMENTATION: Card sum matches build value');
      return augmentBuild(gameState, targetBuild, augmentationStack);
    } else {
      console.log('[BUILD_VALIDATE] ❌ INVALID AUGMENTATION: Card sum mismatch', {
        totalValue,
        buildValue: targetBuild.value,
        cardCount
      });
      throw new Error(`Cards sum to ${totalValue}, must equal build value ${targetBuild.value}`);
    }
  }
}

/**
 * Handle build capture: Remove build from table, add to player's captures
 */
function captureBuild(gameState, playerIndex, targetBuild, captureCard, augmentationStack) {
  console.log('[FUNCTION] 🚀 ENTERING captureBuild', {
    buildId: targetBuild.buildId,
    playerIndex,
    captureCard: `${captureCard.rank}${captureCard.suit}`,
    timestamp: Date.now()
  });
  console.log('[BUILD_CAPTURE] 🏆 CAPTURING BUILD:', {
    buildId: targetBuild.buildId,
    buildValue: targetBuild.value,
    captureCard: `${captureCard.rank}${captureCard.suit}`,
    playerIndex
  });

  // Remove build from table
  const buildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === targetBuild.buildId
  );

  if (buildIndex >= 0) {
    gameState.tableCards.splice(buildIndex, 1);
    console.log('[BUILD_CAPTURE] ✅ Build removed from table at index:', buildIndex);
  }

  // Add all cards (build cards + capture card) to player's captures
  const allCardsToCapture = [...targetBuild.cards, captureCard];

  if (!gameState.playerCaptures[playerIndex]) {
    gameState.playerCaptures[playerIndex] = [];
  }

  gameState.playerCaptures[playerIndex].push(...allCardsToCapture);

  console.log('[BUILD_CAPTURE] ✅ Added cards to captures:', {
    capturedCount: allCardsToCapture.length,
    totalCaptures: gameState.playerCaptures[playerIndex].length,
    playerIndex
  });

  // Remove augmentation stack from table
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === augmentationStack.stackId
  );

  if (stackIndex >= 0) {
    gameState.tableCards.splice(stackIndex, 1);
    console.log('[BUILD_CAPTURE] ✅ Augmentation stack removed from table');
  }

  // Advance turn (like other capture actions)
  gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;

  console.log('[BUILD_CAPTURE] ✅ Build capture completed:', {
    buildValue: targetBuild.value,
    capturedCards: allCardsToCapture.length,
    nextPlayer: gameState.currentPlayer
  });

  return gameState;
}

/**
 * Handle build augmentation: Add cards to existing build
 */
function augmentBuild(gameState, targetBuild, augmentationStack) {
  console.log('[FUNCTION] 🚀 ENTERING augmentBuild', {
    buildId: targetBuild.buildId,
    addedCards: augmentationStack.cards.length,
    timestamp: Date.now()
  });
  console.log('[BUILD_AUGMENT] 🔧 AUGMENTING BUILD:', {
    buildId: targetBuild.buildId,
    buildValue: targetBuild.value,
    addedCards: augmentationStack.cards.length,
    augmentationValue: augmentationStack.value
  });

  // Add all cards from augmentation stack to the build
  targetBuild.cards.push(...augmentationStack.cards);

  console.log('[BUILD_AUGMENT] ✅ Cards added to build:', {
    buildId: targetBuild.buildId,
    newCardCount: targetBuild.cards.length,
    buildValue: targetBuild.value // Note: value stays the same for builds
  });

  // Remove augmentation stack from table
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === augmentationStack.stackId
  );

  if (stackIndex >= 0) {
    gameState.tableCards.splice(stackIndex, 1);
    console.log('[BUILD_AUGMENT] ✅ Augmentation stack removed from table');
  }

  console.log('[BUILD_AUGMENT] ✅ Build augmentation completed:', {
    buildId: targetBuild.buildId,
    finalCardCount: targetBuild.cards.length,
    buildValue: targetBuild.value
  });

  return gameState;
}

module.exports = handleValidateBuildAugmentation;
