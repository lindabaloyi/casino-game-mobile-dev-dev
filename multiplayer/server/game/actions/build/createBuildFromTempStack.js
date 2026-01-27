/**
 * Create Build From Temp Stack Action Handler
 * Player creates a permanent build from temp stack (ends turn)
 */

const { createLogger } = require("../../../utils/logger");
const { buildLifecycleTracker } = require("../../GameState");

// Inline build extension utilities to avoid module resolution issues
const analyzeBuildForExtension = (cards) => {
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
    isExtendable,
  };
};

const logger = createLogger("CreateBuildFromTempStack");

function handleCreateBuildFromTempStack(
  gameManager,
  playerIndex,
  action,
  gameId,
) {
  const { tempStackId, buildValue } = action.payload; // Remove hasBase from payload

  console.log("[CREATE_BUILD_DEBUG] Received payload:", {
    tempStackId,
    buildValue,
    playerIndex,
  });

  logger.info("Creating build from temp stack", {
    tempStackId,
    buildValue,
    playerIndex,
  });

  const gameState = gameManager.getGameState(gameId);

  // 🚫 GUARD RAIL: Prevent multiple active builds per player
  const existingBuild = gameState.tableCards.find(
    (card) => card.type === 'build' && card.owner === playerIndex
  );

  if (existingBuild) {
    throw new Error('Player can only have one active build at a time');
  }

  // Find temp stack
  const tempStackIndex = gameState.tableCards.findIndex(
    (card) => card.stackId === tempStackId,
  );

  if (tempStackIndex === -1) {
    logger.warn("Temp stack not found", { tempStackId });
    return gameState; // Return unchanged state
  }

  const tempStack = gameState.tableCards[tempStackIndex];
  const tempStackCards = tempStack.cards || [];

  // Remove temp stack from table
  gameState.tableCards.splice(tempStackIndex, 1);

  // Create permanent build (no card additions - just convert temp stack as-is)
  const buildCards = [...tempStackCards];

  // Determine hasBase for same-value builds based on chosen buildValue
  let determinedHasBase;
  const allSameValue = buildCards.length > 1 && buildCards.every(card => card.value === buildCards[0].value);

  if (allSameValue) {
    const cardValue = buildCards[0].value;
    const cardCount = buildCards.length;
    const sumValue = cardValue * cardCount;
    // If building the card value, it's a base build; if building the sum, it's not
    determinedHasBase = (buildValue === cardValue);

    console.log("[SAME_VALUE_BUILD_DEBUG] Same-value build detected:", {
      cardValue,
      cardCount,
      sumValue,
      chosenBuildValue: buildValue,
      isBaseBuild: determinedHasBase,
      buildType: determinedHasBase ? "BASE_BUILD" : "SUM_BUILD",
      cards: buildCards.map(c => `${c.rank}${c.suit}`),
    });
  } else {
    console.log("[MIXED_VALUE_BUILD_DEBUG] Mixed-value build:", {
      buildValue,
      cards: buildCards.map(c => `${c.rank}${c.suit}(${c.value})`),
      usingExtensionAnalysis: true,
    });
  }

  // Analyze build for extension eligibility
  const extensionAnalysis = analyzeBuildForExtension(buildCards);

  // Separate hasBase from the rest of the analysis to avoid overwriting
  const { hasBase: analysisHasBase, ...restOfAnalysis } = extensionAnalysis;

  const build = {
    type: "build",
    buildId: `build-${playerIndex}`, // ✅ SIMPLE: Same pattern as temp stacks (players can only have 1 build)
    cards: buildCards,
    value: buildValue,
    hasBase: determinedHasBase !== undefined ? determinedHasBase : analysisHasBase,
    owner: playerIndex,
    // Extension eligibility flags
    ...restOfAnalysis,
  };

  // CRITICAL DEBUG: Log build creation with full details
  console.log("[CREATE_BUILD_CRITICAL] Creating permanent build:", {
    tempStackId,
    newBuildId: build.buildId,
    buildCards: build.cards.map((c, i) => `${i}:${c.rank}${c.suit}`),
    buildValue,
    hasBase: build.hasBase, // ✅ VALIDATE hasBase flag
    buildType: build.hasBase ? "BASE_BUILD" : "NORMAL_BUILD", // ✅ VALIDATE build type
    owner: playerIndex,
    tempStackCards: tempStackCards.map((c) => `${c.rank}${c.suit}`),
    lifecycleTracking: "CREATED",
  });

  // Track build creation
  buildLifecycleTracker.trackCreation(
    build.buildId,
    "createBuildFromTempStack",
    {
      tempStackId,
      buildValue,
      owner: playerIndex,
      cardCount: build.cards.length,
    },
  );

  // Add build to table
  gameState.tableCards.push(build);

  // Debug all builds after creation
  buildLifecycleTracker.debugAllBuilds(gameState, "AfterCreateBuild");

  logger.info("Build created from temp stack", {
    buildId: build.buildId,
    value: buildValue,
    cardCount: build.cards.length,
    playerIndex,
    // Turn ends (like capture)
  });

  return gameState;
}

module.exports = handleCreateBuildFromTempStack;
