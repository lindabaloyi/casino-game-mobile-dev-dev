/**
 * Accept Build Addition Action Handler
 * Validates and permanently accepts pending build additions that sum to the build value
 * Uses advanced build recognition logic to detect valid combinations
 */

const { createLogger } = require("../../../utils/logger");
const {
  detectNormalBuildCombinations,
} = require("../../logic/utils/tempStackBuildCalculator");

const logger = createLogger("AcceptBuildAddition");

function handleAcceptBuildAddition(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info("Accepting build addition", { buildId, playerIndex });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the build with pending additions
  const buildIndex = gameState.tableCards.findIndex(
    (card) => card.type === "build" && card.buildId === buildId,
  );

  if (buildIndex === -1) {
    logger.warn("Build not found", { buildId });
    throw new Error("Build not found");
  }

  const build = gameState.tableCards[buildIndex];

  // Check if build has pending additions
  const pendingAddition = gameState.pendingBuildAdditions?.[buildId];
  if (!pendingAddition) {
    logger.warn("No pending addition for build", { buildId });
    throw new Error("No pending addition to accept");
  }

  // Validate ownership
  if (build.owner !== playerIndex) {
    logger.warn("Player does not own build", {
      buildId,
      buildOwner: build.owner,
      playerIndex,
    });
    throw new Error("You do not own this build");
  }

  // Calculate sum of pending cards
  const pendingCards = pendingAddition.cards || [];
  const pendingCardValues = pendingCards.map((c) => c.value || 0);
  const pendingCardSum = pendingCardValues.reduce(
    (sum, value) => sum + value,
    0,
  );
  const existingBuildValue = build.value;

  logger.info("Validating build addition with advanced logic", {
    buildId,
    existingBuildValue,
    pendingCards: pendingCards.map((c) => `${c.rank}${c.suit}`),
    pendingCardValues,
    pendingCardSum,
  });

  // 🎯 ADVANCED VALIDATION: Check two conditions for acceptance
  // 1. Pending cards can be partitioned into combinations that each sum to the build value
  // 2. OR the total sum of pending cards equals the build value

  const buildCombinations = detectNormalBuildCombinations(pendingCardValues);

  logger.info("Build combinations detected", {
    buildId,
    pendingCardSum,
    combinationsFound: buildCombinations.length,
    combinations: buildCombinations.map((c) => ({
      buildValue: c.buildValue,
      segmentCount: c.segmentCount,
      segments: c.segments,
    })),
  });

  // Check if any combination has the same build value as the existing build
  const validCombination = buildCombinations.find(
    (combo) => combo.buildValue === existingBuildValue,
  );

  // Additional check: if the total sum equals the build value, also accept
  const sumEqualsBuildValue = pendingCardSum === existingBuildValue;

  logger.info("Validation results", {
    buildId,
    hasValidCombination: !!validCombination,
    sumEqualsBuildValue,
    willAccept: !!validCombination || sumEqualsBuildValue,
  });

  if (!validCombination && !sumEqualsBuildValue) {
    logger.warn(
      "Build addition validation failed - no valid combinations match existing build value",
      {
        buildId,
        existingBuildValue,
        pendingCardSum,
        combinationsChecked: buildCombinations.length,
        availableBuildValues: buildCombinations.map((c) => c.buildValue),
      },
    );

    // Generate helpful error message
    const cardValues = pendingCardValues.join("+");
    const availableValues = [
      ...new Set(buildCombinations.map((c) => c.buildValue)),
    ].join(", ");

    let errorMessage = `Invalid build addition. Cards [${cardValues}] sum to ${pendingCardSum}. `;
    if (buildCombinations.length === 0) {
      errorMessage += "These cards cannot form any valid build combinations.";
    } else {
      errorMessage += `These cards can form builds of values: ${availableValues}, but must match existing build value (${existingBuildValue}).`;
    }

    throw new Error(errorMessage);
  }

  logger.info("Build addition validation passed with advanced logic", {
    buildId,
    validCombination: {
      buildValue: validCombination.buildValue,
      segmentCount: validCombination.segmentCount,
      segments: validCombination.segments,
    },
  });

  // VALIDATION PASSED: Accept the additions permanently

  logger.info("Build addition validated - accepting permanently", {
    buildId,
    cards: pendingCards.map((c) => `${c.rank}${c.suit}`),
    newCardCount: build.cards.length, // Cards already added during pending creation
  });

  // Cards are already added to build during pending addition creation - just clean up pending state

  // Update build display value (capture value stays constant, display shows appropriate value)
  const totalSum = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  const nextMultipleOfBuildValue = Math.ceil(totalSum / build.value) * build.value;
  if (totalSum % build.value === 0) {
    // At a multiple of build value, show the capture value
    build.displayValue = build.value;
  } else {
    // Not at multiple of build value, show deficit to next multiple
    build.displayValue = -(nextMultipleOfBuildValue - totalSum);
  }

  // Remove from pending additions
  delete gameState.pendingBuildAdditions[buildId];

  // Reset hand card usage tracking for next turn
  if (gameState.buildHandCardUsedThisTurn) {
    gameState.buildHandCardUsedThisTurn[playerIndex] = false;
  }

  // END TURN: Move to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info("Build addition accepted successfully - turn ended", {
    buildId,
    playerIndex,
    nextPlayer,
    finalCardCount: build.cards.length,
    finalValue: totalSum,
  });

  return gameState;
}

module.exports = handleAcceptBuildAddition;
