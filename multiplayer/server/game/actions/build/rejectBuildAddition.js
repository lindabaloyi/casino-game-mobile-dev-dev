/**
 * Reject Build Addition Action Handler
 * Reverts a pending build addition, returning added cards to the player's hand
 * and restoring the build to its original state.
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("RejectBuildAddition");

function handleRejectBuildAddition(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info("[REJECT_BUILD_ADDITION] 🔄 Starting rejection process", {
    buildId,
    playerIndex,
    gameId,
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // --- NEW DEBUG LOGGING ---
  logger.debug("[REJECT_BUILD_ADDITION] 🔍 Debugging build rejection conditions:", {
    receivedBuildId: buildId,
    requestingPlayerIndex: playerIndex,
    allPendingBuildAdditions: gameState.pendingBuildAdditions, // Log the entire object
    specificPendingEntry: gameState.pendingBuildAdditions?.[buildId], // Log the specific entry
    pendingEntryPlayerIndex: gameState.pendingBuildAdditions?.[buildId]?.playerIndex, // Log its playerIndex
  });
  // --- END NEW DEBUG LOGGING ---
  
  // Find the build with pending addition
  const buildIndex = gameState.tableCards.findIndex(
    (card) =>
      card.type === "build" &&
      card.buildId === buildId &&
      gameState.pendingBuildAdditions?.[buildId]?.playerId === playerIndex, // Ensure it's this player's pending addition
  );

  if (buildIndex === -1) {
    logger.error(
      "[REJECT_BUILD_ADDITION] ❌ Build with pending addition not found for this player - aborting",
      {
        requestedBuildId: buildId,
        playerIndex,
        availableBuilds: gameState.tableCards
          .filter((card) => card.type === "build")
          .map((card) => ({
            buildId: card.buildId,
            isPendingAddition: gameState.pendingBuildAdditions?.[card.buildId] !== undefined,
            pendingAdditionPlayer: gameState.pendingBuildAdditions?.[card.buildId]?.playerIndex,
          })),
      },
    );
    throw new Error("Build with pending addition not found for current player");
  }

  const pendingBuild = gameState.tableCards[buildIndex];
  const pendingAdditionDetails = gameState.pendingBuildAdditions?.[buildId] || { addedCards: [] };

  logger.debug("[REJECT_BUILD_ADDITION] 🎯 Pending build found, details:", {
    buildId: pendingBuild.buildId,
    originalValue: pendingBuild.originalValue,
    originalCardsCount: pendingBuild.originalCards?.length,
    pendingAdditionPlayer: pendingAdditionDetails.playerIndex,
  });

  // Restore the original build state
  const restoredBuild = {
    ...pendingBuild,
    cards: pendingBuild.originalCards,
    value: pendingBuild.originalValue,
    // Clear all pending addition state
    previewValue: undefined,
    previewCards: undefined,
    previewOwner: undefined,
    originalValue: undefined,
    originalCards: undefined,
  };

  // Identify and return added cards to player's hand
  // The cards to return are those in pendingAdditionDetails.addedCards
  const cardsToReturn = pendingAdditionDetails?.addedCards || [];
  const playerHand = gameState.playerHands[playerIndex];

  if (!playerHand) {
    logger.error(`[REJECT_BUILD_ADDITION] ❌ Player hand not found for index ${playerIndex}`);
    throw new Error(`Player hand not found for index ${playerIndex}`);
  }

  cardsToReturn.forEach(card => {
    const cleanCard = {
      rank: card.rank,
      suit: card.suit,
      value: card.value,
    };
    playerHand.push(cleanCard);
    logger.debug("[REJECT_BUILD_ADDITION] ✅ Returned card to hand:", { card: cleanCard });
  });

  // Remove the pending addition from gameState
  delete gameState.pendingBuildAdditions[buildId];

  // Update the game state with the restored build
  gameState.tableCards[buildIndex] = restoredBuild;

  logger.info("[REJECT_BUILD_ADDITION] ✅ Build addition rejected successfully", {
    buildId,
    cardsReturnedCount: cardsToReturn.length,
    turnNotAdvanced: true,
  });

  logger.debug("[REJECT_BUILD_ADDITION] 📊 Final state details", {
    buildRestored: {
      buildId: restoredBuild.buildId,
      value: restoredBuild.value,
      cardCount: restoredBuild.cards.length,
    },
    handSizes: gameState.playerHands.map((hand, idx) => ({
      player: idx,
      handSize: hand.length,
    })),
    pendingBuildAdditions: Object.keys(gameState.pendingBuildAdditions).length,
  });

  return gameState;
}

module.exports = handleRejectBuildAddition;