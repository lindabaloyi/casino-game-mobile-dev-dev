/**
 * Casino Scoring System
 * Calculates points based on captured cards with specific rules
 */

const { createLogger } = require("../utils/logger");
const logger = createLogger("Scoring");

/**
 * Calculate points for an individual card
 * @param {Object} card - Card object with rank and suit
 * @returns {number} Points for this card
 */
function calculateCardPoints(card) {
  // 10 Diamond = 2 points
  if (card.rank === "10" && card.suit === "♦") {
    return 2;
  }

  // 2 Spade = 1 point
  if (card.rank === "2" && card.suit === "♠") {
    return 1;
  }

  // Each Ace = 1 point
  if (card.rank === "A") {
    return 1;
  }

  return 0;
}

/**
 * Calculate score for a player's captured cards
 * @param {Array} capturedCards - Array of captured card objects
 * @returns {number} Total score for the player
 */
function calculatePlayerScore(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return 0;
  }

  let score = 0;

  // 1. Individual card points
  score += capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  // 2. Count spades and total cards for bonuses
  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠",
  ).length;

  const totalCards = capturedCards.length;

  // 3. Spades bonus: Player with 6 spades has 2 points
  if (spadeCount >= 6) {
    score += 2;
    logger.debug(`♠ Spades bonus: ${spadeCount} spades ≥ 6, +2 points`);
  }

  // 4. Card count bonus: Player with 21 or more cards has 2 points
  if (totalCards >= 21) {
    score += 2;
    logger.debug(`🃏 Card count bonus: ${totalCards} cards ≥ 21, +2 points`);
  }

  logger.debug(`Player score calculation: ${score} points`, {
    totalCards,
    spadeCount,
    cardPoints: capturedCards.reduce(
      (sum, card) => sum + calculateCardPoints(card),
      0,
    ),
    hasSpadesBonus: spadeCount >= 6,
    hasCardCountBonus: totalCards >= 21,
  });

  return score;
}

/**
 * Calculate final scores for both players with special rules
 * @param {Array} playerCaptures - Array of [player0Captures, player1Captures]
 * @returns {Array} [player0Score, player1Score]
 */
function calculateFinalScores(playerCaptures) {
  if (
    !playerCaptures ||
    !Array.isArray(playerCaptures) ||
    playerCaptures.length !== 2
  ) {
    logger.error("Invalid playerCaptures array", { playerCaptures });
    return [0, 0];
  }

  const [p0Cards, p1Cards] = playerCaptures;

  let p0Score = calculatePlayerScore(p0Cards || []);
  let p1Score = calculatePlayerScore(p1Cards || []);

  const p0TotalCards = (p0Cards || []).length;
  const p1TotalCards = (p1Cards || []).length;

  // Special case: If players have 20 cards each, 1 point each player
  if (p0TotalCards === 20 && p1TotalCards === 20) {
    p0Score += 1;
    p1Score += 1;
    logger.info(`🎯 20-card tie: Both players have 20 cards, +1 point each`);
  }

  const totalScore = p0Score + p1Score;
  const expectedTotal = 11;

  if (totalScore !== expectedTotal) {
    logger.warn(
      `⚠️ Score total mismatch: ${totalScore} (expected ${expectedTotal})`,
      {
        p0Score,
        p1Score,
        p0Cards: p0TotalCards,
        p1Cards: p1TotalCards,
      },
    );
  } else {
    logger.info(
      `✅ Score calculation complete: [${p0Score}, ${p1Score}] = ${totalScore} points`,
    );
  }

  return [p0Score, p1Score];
}

/**
 * Update scores in game state
 * @param {Object} gameState - Game state object
 * @returns {Object} Updated game state with new scores
 */
function updateScores(gameState) {
  if (!gameState) {
    logger.error("No game state provided for score update");
    return gameState;
  }

  const newScores = calculateFinalScores(gameState.playerCaptures);
  gameState.scores = newScores;

  logger.info(`📊 Scores updated: [${newScores[0]}, ${newScores[1]}]`);

  return gameState;
}

module.exports = {
  calculateCardPoints,
  calculatePlayerScore,
  calculateFinalScores,
  updateScores,
};
