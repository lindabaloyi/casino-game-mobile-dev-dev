/**
 * Game Over Action
 * Extracts point-scoring cards from captures and displays them on table for final scoring
 */
const { createLogger } = require("../../utils/logger");
const { calculateFinalScores } = require("../scoring");

const logger = createLogger("GameOver");

async function handleGameOver(gameManager, playerIndex, action, gameId) {
  console.log("🎮 [GAME_OVER] Starting game over action");
  console.log("🎮 [GAME_OVER] Player captures before extraction:", {
    player0: gameManager.getGameState(gameId).playerCaptures[0].length,
    player1: gameManager.getGameState(gameId).playerCaptures[1].length,
  });

  logger.info(
    "🎮 Executing game over - extracting point cards for final scoring display",
  );

  const gameState = gameManager.getGameState(gameId);

  // Extract point cards from each player's captures
  console.log("🎮 [GAME_OVER] Extracting point cards from captures...");
  const pointCardsDisplay = extractPointCardsForDisplay(
    gameState.playerCaptures,
  );

  console.log("🎮 [GAME_OVER] Point cards extracted:", {
    totalCards: pointCardsDisplay.length,
    pointCards: pointCardsDisplay.filter(
      (c) => c.type === "game-over-point-card",
    ).length,
    bonuses: pointCardsDisplay.filter((c) => c.type === "game-over-bonus")
      .length,
    separators: pointCardsDisplay.filter(
      (c) => c.type === "game-over-separator",
    ).length,
  });

  // Clear the table and place point cards for display
  console.log(
    "🎮 [GAME_OVER] Clearing table and placing point cards for display",
  );
  gameState.tableCards = pointCardsDisplay;

  // Mark game as over
  console.log("🎮 [GAME_OVER] Marking game as over");
  gameState.gameOver = true;
  gameState.gameOverTimestamp = Date.now();

  // Final score calculation (should already be done in cleanup, but ensure it's current)
  console.log("🎮 [GAME_OVER] Calculating final scores");
  gameState.scores = calculateFinalScores(gameState.playerCaptures);

  console.log("🎮 [GAME_OVER] Final game state:", {
    gameOver: gameState.gameOver,
    tableCardsCount: gameState.tableCards.length,
    finalScores: gameState.scores,
    totalPoints: gameState.scores[0] + gameState.scores[1],
  });

  logger.info("🏁 Game over complete", {
    pointCardsDisplayed: pointCardsDisplay.length,
    finalScores: gameState.scores,
    totalPoints: gameState.scores[0] + gameState.scores[1],
  });

  console.log("🎮 [GAME_OVER] Game over action completed successfully");
  return gameState;
}

/**
 * Extract point-scoring cards from player captures and create display structure
 * @param {Array} playerCaptures - [player0Captures[], player1Captures[]]
 * @returns {Array} Table cards for point display
 */
function extractPointCardsForDisplay(playerCaptures) {
  const displayCards = [];

  playerCaptures.forEach((captures, playerIndex) => {
    const playerPointCards = extractPlayerPointCards(captures, playerIndex);

    // Add player's point cards to display
    displayCards.push(...playerPointCards);

    // Add separator between players
    if (playerIndex < playerCaptures.length - 1) {
      displayCards.push({
        type: "game-over-separator",
        separator: `player-${playerIndex}-end`,
      });
    }
  });

  logger.debug("Point cards extracted for display", {
    totalDisplayCards: displayCards.length,
    playersProcessed: playerCaptures.length,
  });

  return displayCards;
}

/**
 * Extract point cards and bonuses for a specific player
 * @param {Array} captures - Player's captured cards
 * @param {number} playerIndex - Player index (0 or 1)
 * @returns {Array} Point cards for this player
 */
function extractPlayerPointCards(captures, playerIndex) {
  const pointCards = [];
  const totalCards = captures.length;

  // 1. Extract individual point cards
  const individualPointCards = extractIndividualPointCards(captures);
  pointCards.push(
    ...individualPointCards.map((card) => ({
      ...card,
      type: "game-over-point-card",
      player: playerIndex,
      pointValue: getCardPointValue(card),
    })),
  );

  // 2. Check for spades bonus (6+ spades)
  const spades = captures.filter((card) => card.suit === "♠");
  if (spades.length >= 6) {
    // Add spades bonus indicator
    pointCards.push({
      type: "game-over-bonus",
      bonus: "spades-6",
      player: playerIndex,
      count: spades.length,
      points: 2,
      description: `${spades.length} Spades`,
    });

    logger.debug(
      `♠ Spades bonus for player ${playerIndex}: ${spades.length} spades (+2 points)`,
    );
  }

  // 3. Check for card count bonus (21+ cards)
  if (totalCards >= 21) {
    // Add special *21 card for 21+ cards bonus
    pointCards.push({
      type: "game-over-bonus",
      bonus: "cards-21",
      player: playerIndex,
      count: totalCards,
      points: 2,
      description: `*${totalCards} Cards`,
      rank: "*",
      suit: "21",
      value: totalCards,
    });

    logger.debug(
      `🃏 Card count bonus for player ${playerIndex}: ${totalCards} cards (+2 points)`,
    );
  }

  // 4. Check for 20-card tie bonus
  if (totalCards === 20) {
    // This will be handled in final scoring, but we can add a visual indicator
    pointCards.push({
      type: "game-over-bonus",
      bonus: "tie-20",
      player: playerIndex,
      count: totalCards,
      points: 1,
      description: "20-Card Tie",
      rank: "20",
      suit: "TIE",
      value: 20,
    });

    logger.debug(
      `🎯 20-card tie indicator for player ${playerIndex}: +1 point`,
    );
  }

  return pointCards;
}

/**
 * Extract individual point-scoring cards from captures
 * @param {Array} captures - Player's captured cards
 * @returns {Array} Point-scoring cards only
 */
function extractIndividualPointCards(captures) {
  return captures.filter((card) => {
    // 10 Diamond = 2 points
    if (card.rank === "10" && card.suit === "♦") return true;
    // 2 Spade = 1 point
    if (card.rank === "2" && card.suit === "♠") return true;
    // Any Ace = 1 point
    if (card.rank === "A") return true;
    return false;
  });
}

/**
 * Get the point value of a card
 * @param {Object} card - Card object
 * @returns {number} Point value
 */
function getCardPointValue(card) {
  if (card.rank === "10" && card.suit === "♦") return 2;
  if (card.rank === "2" && card.suit === "♠") return 1;
  if (card.rank === "A") return 1;
  return 0;
}

module.exports = handleGameOver;
