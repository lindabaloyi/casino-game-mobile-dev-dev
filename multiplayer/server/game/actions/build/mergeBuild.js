/**
 * Merge Build Action Handler
 * Merge two builds together (like addToOwnBuild but for entire stacks)
 * Used for overtake mechanic when player chooses "Merge" from extension modal
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("MergeBuild");

function handleMergeBuild(gameManager, playerIndex, action, gameId) {
  const startTime = Date.now();
  const { sourceBuildId, targetBuildId } = action.payload;

  logger.info("🔀 MERGE BUILD ACTION RECEIVED", {
    sourceBuildId,
    targetBuildId,
    playerIndex,
    gameId,
    actionType: action.type,
    fullPayload: action.payload
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find both builds
  const sourceBuild = gameState.tableCards.find(
    (card) => card.type === "build" && card.buildId === sourceBuildId
  );

  const targetBuild = gameState.tableCards.find(
    (card) => card.type === "build" && card.buildId === targetBuildId
  );

  if (!sourceBuild) {
    logger.warn("Source build not found", { sourceBuildId });
    throw new Error("Source build not found");
  }

  if (!targetBuild) {
    logger.warn("Target build not found", { targetBuildId });
    throw new Error("Target build not found");
  }

  // Validation: Target build must belong to current player
  if (targetBuild.owner !== playerIndex) {
    logger.warn("Target build not owned by player", {
      targetBuildId,
      targetOwner: targetBuild.owner,
      playerIndex
    });
    throw new Error("Target build must belong to you");
  }

  // Optional: Could validate that builds have compatible values, but for simplicity just merge
  logger.info("Merge validation passed", {
    sourceBuildId,
    targetBuildId,
    sourceValue: sourceBuild.value,
    targetValue: targetBuild.value,
    playerIndex,
  });

  // EXECUTE MERGE (like addToOwnBuild but for stacks)

  // 1. Merge source build cards into target build
  const sourceCards = sourceBuild.isPendingExtension ? sourceBuild.previewCards : sourceBuild.cards || [];
  targetBuild.cards = [...targetBuild.cards, ...sourceCards];

  // 2. Update target build value
  const sourceValue = sourceBuild.isPendingExtension ? sourceBuild.previewValue : sourceBuild.value;
  targetBuild.value += sourceValue;

  // 3. Update display value (simple sum for now)
  targetBuild.displayValue = targetBuild.value;

  // 4. Remove source build from table
  const sourceBuildIndex = gameState.tableCards.findIndex(
    card => card.buildId === sourceBuildId
  );

  if (sourceBuildIndex >= 0) {
    gameState.tableCards.splice(sourceBuildIndex, 1);
  }

  // 5. Advance to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info("🔀 MERGE COMPLETED SUCCESSFULLY", {
    playerIndex,
    nextPlayer,
    sourceBuildId,
    targetBuildId,
    mergedCards: sourceCards.map(c => `${c.rank}${c.suit}`),
    targetNewValue: targetBuild.value,
    targetNewCardCount: targetBuild.cards.length,
    serverProcessingTime: Date.now() - startTime,
    timestamp: Date.now()
  });

  return gameState;
}

module.exports = handleMergeBuild;
