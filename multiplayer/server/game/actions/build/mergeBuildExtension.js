/**
 * Merge Build Extension Action Handler
 * Merges a pending build extension into the player's existing build instead of creating a new build
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("MergeBuildExtension");

function handleMergeBuildExtension(gameManager, playerIndex, action, gameId) {
  const { sourceBuildId, targetPlayerBuildId } = action.payload;

  logger.info("🔀 MERGE BUILD EXTENSION - merging extension into existing player build", {
    sourceBuildId,
    targetPlayerBuildId,
    playerIndex,
    gameId,
    actionType: action.type,
    fullPayload: action.payload
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the source build (the one with pending extension)
  const sourceBuild = gameState.tableCards.find(
    (card) => card.type === "build" && card.buildId === sourceBuildId && card.isPendingExtension
  );

  if (!sourceBuild) {
    logger.warn("Source build with pending extension not found", { sourceBuildId });
    throw new Error("Source build with pending extension not found");
  }

  // Find the target build (player's existing build to merge into)
  const targetBuild = gameState.tableCards.find(
    (card) => card.type === "build" && card.buildId === targetPlayerBuildId
  );

  if (!targetBuild) {
    logger.warn("Target player build not found", { targetPlayerBuildId });
    throw new Error("Target player build not found");
  }

  // Validation: Target build must belong to current player
  if (targetBuild.owner !== playerIndex) {
    logger.warn("Target build not owned by player", {
      targetPlayerBuildId,
      targetOwner: targetBuild.owner,
      playerIndex
    });
    throw new Error("Target build must belong to you");
  }

  // Validation: Source build must be the one with pending extension for this player
  if (sourceBuild.pendingExtensionPlayer !== playerIndex) {
    logger.warn("Source build pending extension not for this player", {
      sourceBuildId,
      pendingExtensionPlayer: sourceBuild.pendingExtensionPlayer,
      playerIndex
    });
    throw new Error("Pending extension is not for you");
  }

  // 🔒 VALUE COMPATIBILITY VALIDATION: Builds must have the same value to merge
  const sourceValue = sourceBuild.isPendingExtension ? sourceBuild.previewValue : sourceBuild.value;
  const targetValue = targetBuild.value;

  if (sourceValue !== targetValue) {
    logger.warn("Build merge blocked - incompatible values", {
      sourceBuildId,
      targetPlayerBuildId,
      sourceValue,
      targetValue,
      difference: Math.abs(sourceValue - targetValue),
      playerIndex
    });

    // 🚨 THROW ERROR - Incompatible build values
    // GameCoordinatorService will catch this and send error to client via modal manager
    throw new Error(
      `Cannot merge builds with different values (${sourceValue} and ${targetValue}). Builds must have the same capture value to merge.`
    );
  }

  logger.info("Merge extension validation passed", {
    sourceBuildId,
    targetPlayerBuildId,
    sourceValue,
    targetValue,
    extensionCard: sourceBuild.pendingExtensionCard ?
      `${sourceBuild.pendingExtensionCard.rank}${sourceBuild.pendingExtensionCard.suit}` : 'none',
    playerIndex,
  });

  // EXECUTE MERGE: Add ALL cards from the source build to the player's existing build
  // Use previewCards if available (includes extension), otherwise use original cards + extension
  const sourceCards = sourceBuild.isPendingExtension ? sourceBuild.previewCards : sourceBuild.cards || [];
  const extensionCard = sourceBuild.pendingExtensionCard;

  logger.info("Merging all cards from source build into target build", {
    sourceBuildId,
    targetBuildId: targetPlayerBuildId,
    sourceCardsCount: sourceCards.length,
    sourceCards: sourceCards.map(c => `${c.rank}${c.suit}`),
    extensionCard: extensionCard ? `${extensionCard.rank}${extensionCard.suit}` : 'none',
    targetOriginalCards: targetBuild.cards.map(c => `${c.rank}${c.suit}`),
    targetOriginalValue: targetBuild.value
  });

  // Merge all source cards into target build in descending order
  const { insertCardIntoBuildDescending } = require("../../../utils/buildExtensionUtils");
  const allCardsToMerge = [...sourceCards];

  // Add all cards from source build to target build
  for (const card of allCardsToMerge) {
    targetBuild.cards = insertCardIntoBuildDescending(targetBuild.cards, card);
  }

  // 🔄 MERGE PRESERVATION: Keep the target build's original capture value unchanged
  // The capture value should remain constant for merged builds (strategic gameplay)
  const originalCaptureValue = targetBuild.value;

  // Update display value to show the capture value (same as the preserved value)
  targetBuild.displayValue = originalCaptureValue;

  logger.info("All source build cards merged into target build (capture value preserved)", {
    mergedCards: allCardsToMerge.map(c => `${c.rank}${c.suit}`),
    targetBuildId: targetPlayerBuildId,
    preservedCaptureValue: targetBuild.value,
    displayValue: targetBuild.displayValue,
    newCardCount: targetBuild.cards.length,
    captureMultiples: `Can capture with ${targetBuild.value}, ${targetBuild.value * 2}, ${targetBuild.value * 3}, etc.`
  });

  // Remove the source build from the table (the opponent build that was being extended)
  const sourceBuildIndex = gameState.tableCards.findIndex(
    card => card.buildId === sourceBuildId
  );

  if (sourceBuildIndex >= 0) {
    gameState.tableCards.splice(sourceBuildIndex, 1);
    logger.info("Source build removed from table", { sourceBuildId });
  }

  // Advance to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info("🔀 MERGE BUILD EXTENSION COMPLETED SUCCESSFULLY", {
    playerIndex,
    nextPlayer,
    sourceBuildId,
    targetPlayerBuildId,
    mergedCards: allCardsToMerge.map(c => `${c.rank}${c.suit}`),
    targetNewValue: targetBuild.value,
    targetNewCardCount: targetBuild.cards.length,
    serverProcessingTime: Date.now(),
    timestamp: Date.now()
  });

  return gameState;
}

module.exports = handleMergeBuildExtension;
