/**
 * Reject Build Action Handler
 * Reverts a pending build, returning cards to the player's hand
 * and restoring the build to its original state.
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("RejectBuild");

function handleRejectBuild(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info("[REJECT_BUILD] 🔄 Starting reject build process", {
    buildId,
    playerIndex,
    gameId,
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the build with pending reject
  const buildIndex = gameState.tableCards.findIndex(
    (card) =>
      card.type === "build" &&
      card.buildId === buildId &&
      gameState.pendingBuildRejections?.[buildId]?.playerIndex === playerIndex, // Ensure it's this player's pending reject
  );

  if (buildIndex === -1) {
    logger.error(
      "[REJECT_BUILD] ❌ Build with pending reject not found for this player - aborting",
      {
        requestedBuildId: buildId,
        playerIndex,
        availableBuilds: gameState.tableCards
          .filter((card) => card.type === "build")
          .map((card) => ({
            buildId: card.buildId,
            isPendingReject: gameState.pendingBuildRejections?.[card.buildId] !== undefined,
            pendingRejectPlayer: gameState.pendingBuildRejections?.[card.buildId]?.playerIndex,
          })),
      },
    );
    throw new Error("Build with pending reject not found for current player");
  }

  const pendingBuild = gameState.tableCards[buildIndex];
  const pendingRejectDetails = gameState.pendingBuildRejections[buildId];

  logger.debug("[REJECT_BUILD] 🎯 Pending build found, details:", {
    buildId: pendingBuild.buildId,
    originalValue: pendingBuild.originalValue,
    originalCardsCount: pendingBuild.originalCards?.length,
    pendingRejectPlayer: pendingRejectDetails.playerIndex,
  });

  // Restore the original build state
  const restoredBuild = {
    ...pendingBuild,
    cards: pendingBuild.originalCards,
    value: pendingBuild.originalValue,
    // Clear all pending reject state
    previewValue: undefined,
    previewCards: undefined,
    previewOwner: undefined,
    originalValue: undefined,
    originalCards: undefined,
  };

  // Identify and return rejected cards to player's hand
  // The cards to return are those in pendingRejectDetails.rejectedCards
  const cardsToReturn = pendingRejectDetails.rejectedCards;
  const playerHand = gameState.playerHands[playerIndex];

  if (!playerHand) {
    logger.error(`[REJECT_BUILD] ❌ Player hand not found for index ${playerIndex}`);
    throw new Error(`Player hand not found for index ${playerIndex}`);
  }

  cardsToReturn.forEach(card => {
    const cleanCard = {
      rank: card.rank,
      suit: card.suit,
      value: card.value,
    };
    playerHand.push(cleanCard);
    logger.debug("[REJECT_BUILD] ✅ Returned card to hand:", { card: cleanCard });
  });

  // Remove the pending reject from gameState
  delete gameState.pendingBuildRejections[buildId];

  // Update the game state with the restored build
  gameState.tableCards[buildIndex] = restoredBuild;

  logger.info("[REJECT_BUILD] ✅ Build rejected successfully", {
    buildId,
    cardsReturnedCount: cardsToReturn.length,
    turnNotAdvanced: true,
  });

  logger.debug("[REJECT_BUILD] 📊 Final state details", {
    buildRestored: {
      buildId: restoredBuild.buildId,
      value: restoredBuild.value,
      cardCount: restoredBuild.cards.length,
    },
    handSizes: gameState.playerHands.map((hand, idx) => ({
      player: idx,
      handSize: hand.length,
    })),
    pendingBuildRejections: Object.keys(gameState.pendingBuildRejections).length,
  });

  return gameState;
}

module.exports = handleRejectBuild;
