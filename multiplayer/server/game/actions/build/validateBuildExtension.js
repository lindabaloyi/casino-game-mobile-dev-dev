/**
 * Validate Build Extension Action Handler
 *
 * NOTE: This file implements an OLDER temp-stack-based extension flow where a
 * temporary stack with `isBuildExtension: true` is placed on the table first.
 *
 * The ACTIVE extension flow is:
 *   BuildExtension.js  →  acceptBuildExtension.js / cancelBuildExtension.js
 *   (uses `isPendingExtension` flag directly on the build object)
 *
 * This handler is NOT registered in socket-server.js. It remains here for
 * reference. Do not register it without first verifying it won't conflict
 * with the active BuildExtension flow.
 */

const { createLogger } = require("../../../utils/logger");
const { checkDuplicateBuildValue } = require("../../GameState");
const {
  analyzeBuildForExtension,
  insertCardIntoBuildDescending,
} = require("../../../utils/buildExtensionUtils");

/**
 * Validate that a build extension is legal.
 * @param {Object} build - The target build
 * @param {Object} extensionCard - The card being used to extend
 * @param {Object} gameState - Current game state (needed for duplicate check)
 */
const validateBuildExtension = (build, extensionCard, gameState) => {
  // 🚫 BLOCK EXTENSIONS ON BASE BUILDS (hasBase: true)
  if (build.hasBase === true) {
    return {
      valid: false,
      error: `Cannot extend base build - base builds are not extendable`,
    };
  }

  // Calculate new total
  const newValue = build.value + extensionCard.value;

  // Extension must maintain valid build (new total <= 10 for casino rules)
  if (newValue > 10) {
    return {
      valid: false,
      newValue,
      error: `Extension would create invalid build value: ${newValue} (max 10)`,
    };
  }

  // 🚫 GUARD RAIL: Prevent duplicate build values on table after extension
  if (gameState) {
    const duplicateCheck = checkDuplicateBuildValue(gameState, newValue, build.buildId);
    if (duplicateCheck.hasDuplicate) {
      const duplicateType = duplicateCheck.duplicateType === 'build' ? 'build' : 'card';
      return {
        valid: false,
        newValue,
        error: `Cannot extend build: A ${duplicateType} with value ${newValue} already exists on the table`,
      };
    }
  }

  return {
    valid: true,
    newValue,
  };
};

/**
 * Create the extended build object after a successful validation.
 * Delegates extension eligibility analysis to the shared utility.
 */
const createExtendedBuild = (build, extensionCard, newOwner, newValue) => {
  const newCards = insertCardIntoBuildDescending(build.cards, extensionCard);
  const extensionAnalysis = analyzeBuildForExtension(newCards);

  return {
    ...build,
    cards: newCards,
    value: newValue,
    owner: newOwner,
    ...extensionAnalysis,
  };
};

const shouldExtensionEndTurn = () => {
  return true; // Build extensions always end the turn
};

const logger = createLogger("ValidateBuildExtension");

function handleValidateBuildExtension(
  gameManager,
  playerIndex,
  action,
  gameId,
) {
  const { tempStackId } = action.payload;

  logger.info("Validating build extension", {
    tempStackId,
    playerIndex,
    gameId,
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the extension temp stack
  const tempStackIndex = gameState.tableCards.findIndex(
    (card) => card.stackId === tempStackId && card.isBuildExtension,
  );

  if (tempStackIndex === -1) {
    logger.warn("Build extension temp stack not found", { tempStackId });
    return gameState;
  }

  const tempStack = gameState.tableCards[tempStackIndex];

  // Find the target build
  const targetBuildIndex = gameState.tableCards.findIndex(
    (card) => card.type === "build" && card.buildId === tempStack.targetBuildId,
  );

  if (targetBuildIndex === -1) {
    logger.warn("Target build not found", {
      targetBuildId: tempStack.targetBuildId,
      tempStackId,
    });
    return gameState;
  }

  const targetBuild = gameState.tableCards[targetBuildIndex];
  const extensionCard = tempStack.extensionCard;

  // Validate the extension (pass gameState for duplicate build value check)
  const validation = validateBuildExtension(targetBuild, extensionCard, gameState);

  if (!validation.valid) {
    logger.warn("Build extension validation failed", {
      error: validation.error,
      extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
      targetBuild: {
        id: targetBuild.buildId,
        value: targetBuild.value,
        owner: targetBuild.owner,
        hasBase: targetBuild.hasBase,
      },
    });

    // 🚨 SEND ERROR TO CLIENT - Build extension blocked
    const errorEvent = {
      type: "buildExtensionFailed",
      payload: {
        error: validation.error,
        targetBuildId: targetBuild.buildId,
        extensionCard: extensionCard,
        reason: validation.error.includes("base build")
          ? "base_build_not_extendable"
          : "invalid_extension",
      },
    };

    // Broadcast error to all clients (or specifically to the attempting player)
    gameManager.broadcastToGame(gameId, errorEvent);

    return gameState;
  }

  logger.info("Build extension validated successfully", {
    extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
    oldBuild: {
      id: targetBuild.buildId,
      value: targetBuild.value,
      owner: targetBuild.owner,
      cards: targetBuild.cards.length,
    },
    newValue: validation.newValue,
    newOwner: playerIndex,
  });

  // Create the extended build
  const extendedBuild = createExtendedBuild(
    targetBuild,
    extensionCard,
    playerIndex, // New owner
    validation.newValue,
  );

  // Update the build in game state
  gameState.tableCards[targetBuildIndex] = extendedBuild;

  // Remove the temp stack
  gameState.tableCards.splice(tempStackIndex, 1);

  // Remove extension card from player's hand
  const handIndex = gameState.playerHands[playerIndex].findIndex(
    (card) =>
      card.rank === extensionCard.rank && card.suit === extensionCard.suit,
  );

  if (handIndex >= 0) {
    gameState.playerHands[playerIndex].splice(handIndex, 1);
    logger.debug("Extension card removed from hand", { handIndex });
  }

  // Handle turn management (extensions end the turn like captures)
  if (shouldExtensionEndTurn()) {
    const nextPlayer = (playerIndex + 1) % 2;
    gameState.currentPlayer = nextPlayer;

    logger.info("Build extension completed - turn ended", {
      previousPlayer: playerIndex,
      nextPlayer,
      extendedBuild: {
        id: extendedBuild.buildId,
        newValue: extendedBuild.value,
        newOwner: extendedBuild.owner,
      },
    });
  }

  return gameState;
}

module.exports = handleValidateBuildExtension;
