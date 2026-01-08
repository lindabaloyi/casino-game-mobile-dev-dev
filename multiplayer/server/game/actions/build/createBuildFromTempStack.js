/**
 * Create Build From Temp Stack Action Handler
 * Player creates a permanent build from temp stack (ends turn)
 */

const { createLogger } = require('../../../utils/logger');
const { buildLifecycleTracker } = require('../../GameState');

// Inline build extension utilities to avoid module resolution issues
const analyzeBuildForExtension = (cards) => {
  const totalSum = cards.reduce((sum, card) => sum + card.value, 0);

  // Check for base structure (one card that supports = total - supports)
  let hasBase = false;
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((sum, card) => sum + card.value, 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      hasBase = true;
      break;
    }
  }

  // Check if single combination (only one way to interpret the build)
  // For now, assume pure sum builds are single combination
  const isSingleCombination = !hasBase;

  // Build is extendable if: <5 cards, no base, single combination
  const isExtendable = cards.length < 5 && !hasBase && isSingleCombination;

  return {
    hasBase,
    isSingleCombination,
    isExtendable
  };
};

const logger = createLogger('CreateBuildFromTempStack');

function handleCreateBuildFromTempStack(gameManager, playerIndex, action, gameId) {
  const { tempStackId, buildValue, buildType, buildCard } = action.payload;

  logger.info('Creating build from temp stack', {
    tempStackId,
    buildValue,
    buildType,
    buildCard: buildCard ? `${buildCard.rank}${buildCard.suit}` : 'none',
    playerIndex
  });

  const gameState = gameManager.getGameState(gameId);

  // Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId
  );

  if (tempStackIndex === -1) {
    logger.warn('Temp stack not found', { tempStackId });
    return gameState; // Return unchanged state
  }

  const tempStack = gameState.tableCards[tempStackIndex];
  const tempStackCards = tempStack.cards || [];
  const playerHand = gameState.playerHands[playerIndex] || [];

  // Handle card removal based on build type
  let cardToAdd = null;

  if (buildType === 'based') {
    // BASED BUILD: Add spare card of same rank as temp stack cards
    const stackValue = tempStackCards[0]?.value;
    const spareCardIndex = playerHand.findIndex(card =>
      card.value === stackValue &&
      !tempStackCards.some(stackCard =>
        stackCard.rank === card.rank && stackCard.suit === card.suit
      )
    );

    if (spareCardIndex === -1) {
      logger.warn('Spare card not found in hand for based build', {
        stackValue,
        handSize: playerHand.length,
        handCards: playerHand.map(c => `${c.rank}${c.suit}(${c.value})`)
      });
      return gameState;
    }

    cardToAdd = playerHand[spareCardIndex];
    gameState.playerHands[playerIndex].splice(spareCardIndex, 1);

    logger.info('Based build: removed spare card from hand', {
      removedCard: `${cardToAdd.rank}${cardToAdd.suit}`,
      stackValue
    });

  } else if (buildType === 'normal') {
    // NORMAL BUILD: Add card with value equal to build total
    const valueCardIndex = playerHand.findIndex(card => card.value === buildValue);

    if (valueCardIndex === -1) {
      logger.warn('Value card not found in hand for normal build', {
        buildValue,
        handSize: playerHand.length,
        handCards: playerHand.map(c => `${c.rank}${c.suit}(${c.value})`)
      });
      return gameState;
    }

    cardToAdd = playerHand[valueCardIndex];
    gameState.playerHands[playerIndex].splice(valueCardIndex, 1);

    logger.info('Normal build: removed value card from hand', {
      removedCard: `${cardToAdd.rank}${cardToAdd.suit}`,
      buildValue
    });

  } else if (buildCard) {
    // LEGACY SUPPORT: Specific build card provided
    const buildCardIndex = playerHand.findIndex(card =>
      card.rank === buildCard.rank && card.suit === buildCard.suit
    );

    if (buildCardIndex === -1) {
      logger.warn('Legacy build card not found in hand', {
        buildCard: `${buildCard.rank}${buildCard.suit}`,
        handSize: playerHand.length
      });
      return gameState;
    }

    cardToAdd = playerHand[buildCardIndex];
    gameState.playerHands[playerIndex].splice(buildCardIndex, 1);
  }

  // Remove temp stack from table
  gameState.tableCards.splice(tempStackIndex, 1);

  // Create permanent build
  const buildCards = cardToAdd ? [...tempStackCards, cardToAdd] : [...tempStackCards];

  // Analyze build for extension eligibility
  const extensionAnalysis = analyzeBuildForExtension(buildCards);

  const build = {
    type: 'build',
    buildId: `build-${playerIndex}`,  // ✅ SIMPLE: Same pattern as temp stacks (players can only have 1 build)
    cards: buildCards,
    value: buildValue,
    owner: playerIndex,
    // Extension eligibility flags
    ...extensionAnalysis
  };

  // CRITICAL DEBUG: Log build creation with full details
  console.log('[CREATE_BUILD_CRITICAL] Creating permanent build:', {
    tempStackId,
    newBuildId: build.buildId,
    buildCards: build.cards.map((c, i) => `${i}:${c.rank}${c.suit}`),
    buildValue,
    owner: playerIndex,
    tempStackCards: tempStackCards.map(c => `${c.rank}${c.suit}`),
    addedBuildCard: buildCard ? `${buildCard.rank}${buildCard.suit}` : 'none',
    lifecycleTracking: 'CREATED'
  });

  // Track build creation
  buildLifecycleTracker.trackCreation(build.buildId, 'createBuildFromTempStack', {
    tempStackId,
    buildValue,
    owner: playerIndex,
    cardCount: build.cards.length
  });

  // Add build to table
  gameState.tableCards.push(build);

  // Debug all builds after creation
  buildLifecycleTracker.debugAllBuilds(gameState, 'AfterCreateBuild');

  logger.info('Build created from temp stack', {
    buildId: build.buildId,
    value: buildValue,
    cardCount: build.cards.length,
    playerIndex,
    // Turn ends (like capture)
  });

  return gameState;
}

module.exports = handleCreateBuildFromTempStack;
