/**
 * Cancel Build Extension Action Handler
 * Cancels the pending build extension and restores original state
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("CancelBuildExtension");

function handleCancelBuildExtension(gameManager, playerIndex, action, gameId) {
  const { buildId } = action.payload;

  logger.info(
    "[BUILD_EXTENSION_CANCEL] 🔄 Starting build extension cancellation",
    {
      buildId,
      playerIndex,
      gameId,
    },
  );

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  logger.debug("[BUILD_EXTENSION_CANCEL] 📋 Build to cancel details", {
    buildId,
    playerIndex,
    currentPlayer: gameState.currentPlayer,
    isPlayerTurn: playerIndex === gameState.currentPlayer,
  });

  // Find the build with pending extension
  const buildIndex = gameState.tableCards.findIndex(
    (card) =>
      card.type === "build" &&
      card.buildId === buildId &&
      card.isPendingExtension,
  );

  if (buildIndex === -1) {
    logger.error(
      "[BUILD_EXTENSION_CANCEL] ❌ Build with pending extension not found - aborting",
      {
        requestedBuildId: buildId,
        availableBuilds: gameState.tableCards
          .filter((card) => card.type === "build")
          .map((card) => ({
            buildId: card.buildId,
            isPendingExtension: card.isPendingExtension,
          })),
      },
    );
    throw new Error("Build with pending extension not found");
  }

  const pendingBuild = gameState.tableCards[buildIndex];
  logger.info(
    "[BUILD_EXTENSION_CANCEL] 🎯 Pending extension build found - preparing smart restoration",
    {
      buildIndex,
      buildId: pendingBuild.buildId,
      extensionCard: `${pendingBuild.pendingExtensionCard.rank}${pendingBuild.pendingExtensionCard.suit}`,
      hasPositionData: !!pendingBuild.cardPositions,
      positionCount: pendingBuild.cardPositions?.length || 0,
    },
  );

  // Track restoration results
  const restorationResults = {
    handCards: [],
    conflicts: [],
  };

  // Smart restoration using position data (like temp stacks)
  if (pendingBuild.cardPositions && pendingBuild.cardPositions.length > 0) {
    logger.debug(
      "[BUILD_EXTENSION_CANCEL] 📍 Using position-aware restoration",
    );

    pendingBuild.cardPositions.forEach(({ cardId, originalIndex, source }) => {
      const card = pendingBuild.pendingExtensionCard;
      if (!card || `${card.rank}${card.suit}` !== cardId) {
        logger.warn(
          `[BUILD_EXTENSION_CANCEL] ⚠️ Card mismatch for position data: ${cardId}`,
        );
        return;
      }

      logger.debug(
        `[BUILD_EXTENSION_CANCEL] 🔄 Restoring ${cardId} from ${source}`,
        {
          originalIndex,
          source,
        },
      );

      // Restore based on source
      if (source === "hand") {
        // Hand card - return to player's hand
        const playerHand = gameState.playerHands[playerIndex];
        if (!playerHand) {
          logger.error(
            `[BUILD_EXTENSION_CANCEL] ❌ Player hand not found for index ${playerIndex}`,
          );
          return;
        }

        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value,
        };

        playerHand.push(cleanCard);
        restorationResults.handCards.push({
          cardId,
          playerIndex,
        });

        logger.debug(
          `[BUILD_EXTENSION_CANCEL] ✅ Returned extension card ${cardId} to player ${playerIndex} hand`,
        );
      } else {
        logger.warn(
          `[BUILD_EXTENSION_CANCEL] ⚠️ Unexpected source '${source}' for extension card ${cardId}, defaulting to hand`,
        );
        // Fallback to hand
        const playerHand = gameState.playerHands[playerIndex];
        const cleanCard = {
          rank: card.rank,
          suit: card.suit,
          value: card.value,
        };
        playerHand.push(cleanCard);
        restorationResults.handCards.push({
          cardId,
          playerIndex,
        });
      }
    });
  } else {
    // Fallback for builds without position data (backward compatibility)
    logger.warn(
      "[BUILD_EXTENSION_CANCEL] ⚠️ No position data available, using legacy restoration",
    );
    const playerHand = gameState.playerHands[playerIndex];
    const extensionCard = pendingBuild.pendingExtensionCard;
    const cleanCard = {
      rank: extensionCard.rank,
      suit: extensionCard.suit,
      value: extensionCard.value,
    };
    playerHand.push(cleanCard);
    restorationResults.handCards.push({
      cardId: `${extensionCard.rank}${extensionCard.suit}`,
      playerIndex,
    });
  }

  // Restore the original build state
  const restoredBuild = {
    ...pendingBuild,
    // Clear all pending extension state
    isPendingExtension: false,
    pendingExtensionCard: undefined,
    pendingExtensionPlayer: undefined,
    cardPositions: undefined,
    // Restore original values
    cards: pendingBuild.originalCards,
    value: pendingBuild.originalValue,
    // Remove preview values
    previewValue: undefined,
    previewCards: undefined,
    previewOwner: undefined,
    originalValue: undefined,
    originalCards: undefined,
  };

  // Replace with restored build
  gameState.tableCards[buildIndex] = restoredBuild;

  // Log comprehensive restoration results
  logger.info(
    "[BUILD_EXTENSION_CANCEL] ✅ Build extension canceled successfully",
    {
      buildId,
      extensionCard: `${pendingBuild.pendingExtensionCard.rank}${pendingBuild.pendingExtensionCard.suit}`,
      handCardsReturned: restorationResults.handCards.length,
      positionConflicts: restorationResults.conflicts.length,
      turnNotAdvanced: true,
    },
  );

  if (restorationResults.conflicts.length > 0) {
    logger.warn(
      "[BUILD_EXTENSION_CANCEL] ⚠️ Position conflicts during restoration",
      {
        conflicts: restorationResults.conflicts,
      },
    );
  }

  logger.debug("[BUILD_EXTENSION_CANCEL] 📊 Final restoration details", {
    buildRestored: {
      buildId: restoredBuild.buildId,
      value: restoredBuild.value,
      cardCount: restoredBuild.cards.length,
    },
    handSizes: gameState.playerHands.map((hand, idx) => ({
      player: idx,
      handSize: hand.length,
    })),
  });

  return gameState;
}

module.exports = handleCancelBuildExtension;
