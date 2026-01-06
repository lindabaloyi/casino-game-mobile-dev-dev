/**
 * Add To Own Build Action Handler
 * Player adds to their own build
 */

const { createLogger } = require('../../../utils/logger');
const { buildLifecycleTracker } = require('../../GameState');
const { buildTracker } = require('../../../../../utils/buildLifecycleTracker');

console.log('[MODULE_LOAD] addToOwnBuild.js loaded, buildTracker imported:', !!buildTracker);

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

  // CRITICAL DEBUG: Log extension attempt
  console.log('[ADD_TO_BUILD_CRITICAL] Extension attempt:', {
    requestedBuildId: action.payload.buildId || action.payload.buildToAddTo?.buildId,
    playerIndex,
    availableBuilds: gameState.tableCards
      .filter(item => item.type === 'build')
      .map(b => ({ id: b.buildId, owner: b.owner, cards: b.cards.length })),
    payloadStructure: action.payload.buildId ? 'drop-handler' : 'contact-handler'
  });

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
    console.error('[ADD_TO_BUILD_CRITICAL] Build not found:', {
      requestedId: buildId,
      allBuildIds: gameState.tableCards
        .filter(item => item.type === 'build')
        .map(b => b.buildId),
      allBuilds: gameState.tableCards
        .filter(item => item.type === 'build')
        .map(b => ({ id: b.buildId, owner: b.owner, cards: b.cards.length }))
    });
    throw new Error("Own build not found");
  }

  // CRITICAL DEBUG: Found target build
  console.log('[ADD_TO_BUILD_CRITICAL] Found target build:', {
    requestedId: buildId,
    actualId: build.buildId,
    idMatch: buildId === build.buildId,
    currentCards: build.cards.map((c, i) => `${i}:${c.rank}${c.suit}`),
    addingCard: `${card.rank}${card.suit}`,
    lifecycleTracking: 'EXTENDING'
  });

  // Track build extension
  buildLifecycleTracker.trackExtension(build.buildId, 'addToOwnBuild', {
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  // CRITICAL FIX: Update the build object DIRECTLY in gameState.tableCards
  // Don't update a local reference - update the persistent object
  const buildIndex = gameState.tableCards.findIndex(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (buildIndex < 0) {
    throw new Error(`Build ${buildId} not found in gameState.tableCards`);
  }

  const gameStateBuild = gameState.tableCards[buildIndex];

  // 🔍 DEBUG: Log build state BEFORE extension
  console.log('[BUILD_ACCUMULATION_DEBUG] Build state BEFORE extension:', {
    buildId,
    extensionNumber: (gameStateBuild.extensionCount || 0) + 1,
    currentCards: gameStateBuild.cards.map((c, i) => `${i}:${c.rank}${c.suit}`),
    currentCardCount: gameStateBuild.cards.length,
    currentValue: gameStateBuild.value,
    addingCard: `${card.rank}${card.suit} (value: ${card.value || 0})`,
    source
  });

  // CRITICAL FIX: Save old state BEFORE any changes
  const oldCardCount = gameStateBuild.cards.length;
  const oldCards = [...gameStateBuild.cards]; // Copy for comparison
  const oldValue = gameStateBuild.value;

  // FIX: Update the build IN gameState.tableCards directly
  gameStateBuild.cards = [
    ...gameStateBuild.cards,
    {
      ...card,
      source,
      addedAt: Date.now()
    }
  ];

  // CRITICAL FIX: Update and save build value properly
  const newValue = gameStateBuild.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  gameStateBuild.value = newValue;
  gameStateBuild.lastUpdated = Date.now();

  // IMMEDIATE ADDITION: Now log AFTER the update (shows correct data!)
  console.log('[BUILD_IMMEDIATE_FIXED] Card successfully added to build:', {
    buildId,
    card: `${card.rank}${card.suit}`,
    oldState: { cards: oldCardCount, value: oldValue },
    newState: { cards: build.cards.length, value: build.value },
    currentCards: build.cards.map((c, i) => `${i}:${c.rank}${c.suit}`),
    valueChange: `${oldValue} → ${build.value}`
  });

  // Verify the array reference fix worked
  console.log('[ARRAY_REFERENCE_FIX] Array reference check:', {
    oldReference: oldCards,
    newReference: build.cards,
    referencesEqual: oldCards === build.cards, // Should be false - React detects!
    cardsPreserved: oldCardCount === build.cards.length - 1,
    buildValueSaved: build.value === newValue
  });

  // Add verification logging (matches temp stack behavior)
  console.log('[BUILD_TEMP_COMPARISON]', {
    buildCards: build.cards.map((c, i) => `${c.rank}${c.suit}=${i}`),
    method: 'spread',
    newestAt: 'end',
    shouldShow: build.cards[build.cards.length - 1]?.rank +
               build.cards[build.cards.length - 1]?.suit + ' (newest on top like temp stacks)',
    valueChange: `${oldValue} → ${build.value}`
  });

  // Remove card from source
  removeCardFromSource(gameState, card, source, playerIndex, action);

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

  // Debug all builds after extension
  buildLifecycleTracker.debugAllBuilds(newGameState, 'AfterAddToOwnBuild');

  // 🔍 FINAL VERIFICATION: Check that our changes persisted
  const finalBuild = newGameState.tableCards.find(item =>
    item.type === 'build' && item.buildId === buildId
  );

  console.log('[BUILD_ACCUMULATION_VERIFICATION] Final build state verification:', {
    buildId,
    totalExtensions: finalBuild?.extensionCount || 0,
    finalCardCount: finalBuild?.cards?.length || 0,
    finalValue: finalBuild?.value || 0,
    finalCards: finalBuild?.cards?.map((c, i) => `${i}:${c.rank}${c.suit}`) || [],
    changesPersisted: finalBuild?.cards?.length === (oldCardCount + 1),
    valueIncreased: (finalBuild?.value || 0) > oldValue,
    topCard: finalBuild?.cards?.[finalBuild.cards.length - 1]?.rank +
             finalBuild?.cards?.[finalBuild.cards.length - 1]?.suit
  });

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
function removeCardFromSource(gameState, card, source, playerIndex, action) {
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
  } else if (source === 'oppTopCard') {
    // Handle opponent top card - validate it's the top card and remove it
    // For build actions, opponentId should come from the action payload
    // This needs to be passed in from the handler - for now, we'll need to modify the function signature
    // or store it in the action payload. Let's assume it's in the payload for now.
    let opponentId;
    if (action && action.payload && action.payload.opponentId !== undefined) {
      opponentId = action.payload.opponentId;
    } else {
      // Fallback: assume playerIndex + 1 (simple multiplayer assumption)
      opponentId = (playerIndex + 1) % 2; // For 2-player game
    }

    if (opponentId === undefined) {
      throw new Error("opponentId is required for oppTopCard source");
    }

    const opponentCaptures = gameState.playerCaptures[opponentId] || [];
    if (opponentCaptures.length === 0) {
      throw new Error(`Opponent ${opponentId} has no captured cards`);
    }

    // Check if it's the top card (last element in array)
    const actualTopCard = opponentCaptures[opponentCaptures.length - 1];
    if (actualTopCard.rank !== card.rank || actualTopCard.suit !== card.suit) {
      throw new Error(`Card ${card.rank}${card.suit} is not opponent ${opponentId}'s top card`);
    }

    // Remove the top card from opponent's captures
    gameState.playerCaptures[opponentId].pop();
    console.log('[BUILD_SOURCE_REMOVAL] ✅ Removed opponent top card from captures');
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToOwnBuild;
