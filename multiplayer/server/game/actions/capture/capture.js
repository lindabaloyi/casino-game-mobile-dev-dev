/**
 * Unified Capture Action
 * Handles all types of captures: temp stacks, builds, and single cards
 */
const { createLogger } = require("../../../utils/logger");
const logger = createLogger("Capture");

async function handleCapture(gameManager, playerIndex, action, gameId) {
  const { tempStackId, captureValue, targetCards, buildId, capturingCard } =
    action.payload;

  logger.info("Capturing temp stack or direct cards", {
    tempStackId,
    captureValue,
    hasTargetCards: !!targetCards,
    targetCardCount: targetCards?.length || 0,
    capturingCard: capturingCard
      ? `${capturingCard.rank}${capturingCard.suit}`
      : "none",
    buildId,
    playerIndex,
  });

  const gameState = gameManager.getGameState(gameId);

  let cardsToCapture = [];

  if (targetCards && targetCards.length > 0) {
    // 1A. Handle captures with explicit targetCards (includes temp stack captures with capturing card)
    logger.info("Capturing target cards directly", {
      targetCards: targetCards.map((c) => `${c.rank}${c.suit}`),
      hasTempStackId: !!tempStackId,
    });

    cardsToCapture = targetCards;

    // If this capture includes a temp stack, remove it from table
    if (tempStackId !== null && tempStackId !== undefined) {
      logger.info("Removing temp stack from table for targetCards capture", {
        tempStackId,
      });

      const tempStackIndex = gameState.tableCards.findIndex(
        (card) => card.stackId === tempStackId,
      );

      if (tempStackIndex !== -1) {
        gameState.tableCards.splice(tempStackIndex, 1);
        logger.debug("Temp stack removed from table", {
          tempStackId,
          tempStackIndex,
        });
      } else {
        logger.warn("Temp stack not found for removal", { tempStackId });
      }
    }

    // If this is a build capture, remove the build from table
    if (buildId) {
      logger.info("Removing build from table", { buildId });

      const buildIndex = gameState.tableCards.findIndex(
        (card) => card.buildId === buildId,
      );

      if (buildIndex !== -1) {
        gameState.tableCards.splice(buildIndex, 1);
        logger.debug("Build removed from table", { buildId, buildIndex });
      } else {
        logger.warn("Build not found for removal", { buildId });
      }
    }

    // For direct captures, remove the captured cards from table (if they're loose cards)
    // Build cards and temp stack cards are already handled above
    if (!buildId && !tempStackId) {
      // Special handling for same-value auto captures
      // These include both the table card AND the dragged card from hand
      // Only remove cards that are actually on the table
      const isSameValueAutoCapture =
        action.payload.captureType === "same_value_auto";

      if (isSameValueAutoCapture && targetCards.length === 2) {
        logger.info(
          "Handling same-value auto capture - removing only table card",
          {
            targetCards: targetCards.map((c) => `${c.rank}${c.suit}`),
            capturingCard: capturingCard
              ? `${capturingCard.rank}${capturingCard.suit}`
              : "none",
          },
        );

        // For same-value captures, only the first card (touched card) is on the table
        // The second card (dragged card) comes from hand and should not be removed from table
        const tableCard = targetCards[0]; // The card that was on the table
        const draggedCard = targetCards[1]; // The card being dragged from hand

        const cardIndex = gameState.tableCards.findIndex(
          (card) =>
            card.rank === tableCard.rank && card.suit === tableCard.suit,
        );

        if (cardIndex !== -1) {
          gameState.tableCards.splice(cardIndex, 1);
          logger.debug("Table card removed for same-value capture", {
            card: `${tableCard.rank}${tableCard.suit}`,
            index: cardIndex,
            draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
          });
        } else {
          logger.warn("Table card not found for same-value capture removal", {
            card: `${tableCard.rank}${tableCard.suit}`,
          });
        }
      } else {
        // Regular direct captures - remove all target cards from table
        logger.info("Removing captured cards from table for direct capture", {
          targetCardCount: targetCards.length,
          targetCards: targetCards.map((c) => `${c.rank}${c.suit}`),
        });

        targetCards.forEach((targetCard) => {
          const cardIndex = gameState.tableCards.findIndex(
            (card) =>
              card.rank === targetCard.rank && card.suit === targetCard.suit,
          );

          if (cardIndex !== -1) {
            gameState.tableCards.splice(cardIndex, 1);
            logger.debug("Card removed from table", {
              card: `${targetCard.rank}${targetCard.suit}`,
              index: cardIndex,
            });
          } else {
            logger.warn("Card not found on table for removal", {
              card: `${targetCard.rank}${targetCard.suit}`,
            });
          }
        });
      }
    }
  } else if (tempStackId !== null && tempStackId !== undefined) {
    // 1B. Handle legacy temp stack capture (no targetCards)
    logger.info("Capturing from temp stack (legacy)", { tempStackId });

    const tempStackIndex = gameState.tableCards.findIndex(
      (card) => card.stackId === tempStackId,
    );

    if (tempStackIndex === -1) {
      logger.warn("Temp stack not found", { tempStackId });
      return gameState;
    }

    const tempStack = gameState.tableCards[tempStackIndex];
    cardsToCapture = tempStack.cards || [];

    logger.debug("Found temp stack", {
      tempStackCards: cardsToCapture.map((c) => `${c.rank}${c.suit}`),
      captureValue,
    });

    // Remove temp stack from table
    gameState.tableCards.splice(tempStackIndex, 1);
  } else {
    logger.error("Invalid capture payload - no tempStackId or targetCards");
    return gameState;
  }

  // 2. Handle capturing card removal from hand
  // Remove capturing card from hand when it's explicitly provided (for all direct captures)
  if (capturingCard) {
    logger.info("Removing capturing card from hand", {
      card: `${capturingCard.rank}${capturingCard.suit}`,
      playerIndex,
    });

    const handIndex = gameState.playerHands[playerIndex].findIndex(
      (card) =>
        card.rank === capturingCard.rank && card.suit === capturingCard.suit,
    );

    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      logger.debug("Capturing card removed from hand", { handIndex });
    } else {
      logger.warn("Capturing card not found in hand", {
        card: `${capturingCard.rank}${capturingCard.suit}`,
        handSize: gameState.playerHands[playerIndex].length,
      });
    }
  }

  // 3. Add captured cards to player's captures
  if (!gameState.playerCaptures) gameState.playerCaptures = [[], []];
  if (!gameState.playerCaptures[playerIndex])
    gameState.playerCaptures[playerIndex] = [];

  gameState.playerCaptures[playerIndex].push(...cardsToCapture);

  // 4. Update scores after capture
  const { calculateFinalScores } = require("../../scoring");
  gameState.scores = calculateFinalScores(gameState.playerCaptures);

  // 5. Track last capturer
  gameState.lastCapturer = playerIndex;

  logger.info("Capture complete", {
    player: playerIndex,
    cardsCaptured: cardsToCapture.length,
    cards: cardsToCapture.map((c) => `${c.rank}${c.suit}`),
    captureType: tempStackId ? "tempStack" : buildId ? "build" : "direct",
  });

  return gameState;
}

module.exports = handleCapture;
