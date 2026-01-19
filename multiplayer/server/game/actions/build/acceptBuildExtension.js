/**
 * Accept Build Extension Action Handler
 * Finalizes the build extension after player confirmation
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("AcceptBuildExtension");

function handleAcceptBuildExtension(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info("Accepting build extension", { buildId, playerIndex });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the build with pending extension
  const buildIndex = gameState.tableCards.findIndex(
    (card) =>
      card.type === "build" &&
      card.buildId === buildId &&
      card.isPendingExtension,
  );

  if (buildIndex === -1) {
    logger.warn("Build with pending extension not found", { buildId });
    return gameState;
  }

  const pendingBuild = gameState.tableCards[buildIndex];

  // 🔐 SAFETY VALIDATION: Ensure player still has the extension card
  // (This is a safety check in case the initial BuildExtension validation was bypassed)
  const playerHand = gameState.playerHands[playerIndex];
  const hasExtensionCard = playerHand.some(
    (card) =>
      card.rank === pendingBuild.pendingExtensionCard.rank &&
      card.suit === pendingBuild.pendingExtensionCard.suit,
  );

  if (!hasExtensionCard) {
    logger.warn(
      "Build extension validation failed - player missing extension card",
      {
        buildId,
        playerIndex,
        missingCard: `${pendingBuild.pendingExtensionCard.rank}${pendingBuild.pendingExtensionCard.suit}`,
        playerHand: playerHand.map((c) => `${c.rank}${c.suit}`),
      },
    );

    // 🚨 THROW ERROR - Extension card not found
    // GameCoordinatorService will catch this and send error to client
    throw new Error(
      "You don't have the required card in your hand to complete this build extension",
    );
  }

  // Remove the extension card from player's hand (final safety removal)
  const cardIndex = playerHand.findIndex(
    (card) =>
      card.rank === pendingBuild.pendingExtensionCard.rank &&
      card.suit === pendingBuild.pendingExtensionCard.suit,
  );

  if (cardIndex >= 0) {
    playerHand.splice(cardIndex, 1);
    logger.debug("Extension card removed from hand during finalization", {
      buildId,
      playerIndex,
      card: `${pendingBuild.pendingExtensionCard.rank}${pendingBuild.pendingExtensionCard.suit}`,
    });
  }

  // Create the finalized extended build
  const extendedBuild = {
    ...pendingBuild,
    // Clear pending state
    isPendingExtension: false,
    pendingExtensionCard: undefined,
    pendingExtensionPlayer: undefined,
    // Apply the extension (card was already removed from hand in BuildExtension)
    cards: pendingBuild.previewCards,
    value: pendingBuild.previewValue,
    owner: pendingBuild.previewOwner,
    // Recalculate extension eligibility
    isExtendable: pendingBuild.previewCards.length < 5,
  };

  // Note: Extension card was already removed from hand in BuildExtension action

  // Replace with finalized build
  gameState.tableCards[buildIndex] = extendedBuild;

  // Turn passes to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info("Build extension accepted - finalized", {
    buildId,
    previousOwner: pendingBuild.owner,
    newOwner: playerIndex,
    nextPlayer,
    finalValue: extendedBuild.value,
    cardCount: extendedBuild.cards.length,
  });

  return gameState;
}

module.exports = handleAcceptBuildExtension;
