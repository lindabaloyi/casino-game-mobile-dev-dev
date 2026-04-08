/**
 * Casino Scoring System
 * Calculates points based on captured cards with specific rules
 * Total available points per deal: 11
 * 
 * Scoring rules:
 * - 10 of diamonds (dix): 2 points
 * - 2 of spades: 1 point
 * - Each Ace: 1 point
 * - Spades bonus: 6+ spades = +2 points
 * - Card count bonus: 21+ cards = +2 points, exactly 20 cards = +1 point
 */

/**
 * Calculate points for an individual card
 * @param {Object} card - Card object with rank and suit
 * @returns {number} Points for this card
 */
function calculateCardPoints(card) {
  // 10 Diamond = 2 points (the "dix")
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
 * Uses standard Casino scoring (total 11 points available)
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
  }

  // 4. Card count bonuses:
  //    - 21 or more cards → 2 points
  //    - Exactly 20 cards   → 1 point
  if (totalCards >= 21) {
    score += 2;
  } else if (totalCards === 20) {
    score += 1;
  }

  return score;
}

/**
 * Calculate score breakdown for a player (for debugging/display)
 * @param {Array} capturedCards - Array of captured card objects
 * @returns {Object} Detailed score breakdown
 */
function getScoreBreakdown(capturedCards) {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return {
      totalCards: 0,
      spadeCount: 0,
      cardPoints: 0,
      spadeBonus: 0,
      cardCountBonus: 0,
      totalScore: 0,
    };
  }

  const cardPoints = capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠",
  ).length;

  const totalCards = capturedCards.length;

  let spadeBonus = 0;
  let cardCountBonus = 0;

  if (spadeCount >= 6) {
    spadeBonus = 2;
  }

  if (totalCards >= 21) {
    cardCountBonus = 2;
  } else if (totalCards === 20) {
    cardCountBonus = 1;
  }

  return {
    totalCards,
    spadeCount,
    cardPoints,
    spadeBonus,
    cardCountBonus,
    totalScore: cardPoints + spadeBonus + cardCountBonus,
  };
}

/**
 * Generate a deterministic hash from a string (for tie-breaking)
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

/**
 * Rank players by score with tie-breakers
 * Tie-breaker order: 1) score, 2) spades, 3) card count, 4) deterministic hash
 * @param {Array} playerIds - Array of player IDs
 * @param {Array} scores - Array of scores
 * @param {Array} breakdowns - Array of score breakdowns with spadeCount and totalCards
 * @returns {Array} Array of player indices sorted by rank (winner first)
 */
function rankPlayers(playerIds, scores, breakdowns) {
  if (!scores || scores.length === 0) return [];
  
  const ranked = scores.map((score, index) => {
    const breakdown = breakdowns?.[index] || {};
    const spades = breakdown.spadeCount || 0;
    const cards = breakdown.totalCards || 0;
    
    const cardIds = (breakdown.cards || [])
      .map(c => `${c.rank}${c.suit}`)
      .sort()
      .join(',');
    
    return {
      index,
      score,
      spades,
      cards,
      hash: deterministicHash(cardIds)
    };
  });
  
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.spades !== a.spades) return b.spades - a.spades;
    if (b.cards !== a.cards) return b.cards - a.cards;
    return a.hash - b.hash;
  });
  
  return ranked.map(r => r.index);
}

/**
 * Get winner index from game state using tie-breaking
 * @param {Object} gameState - Game state with scores and scoreBreakdowns
 * @returns {number} Winner index (never null - uses tie-breaking)
 */
function getWinnerIndex(gameState) {
  const scores = gameState.scores || [];
  const breakdowns = gameState.scoreBreakdowns || [];
  const playerIds = (gameState.players || []).map(p => p.id);
  
  if (scores.length === 0) return 0;
  if (scores.length === 1) return 0;
  
  const ranked = rankPlayers(playerIds, scores, breakdowns);
  return ranked[0];
}

/**
 * Get full rankings for all players (for tournament qualification)
 * @param {Object} gameState - Game state with scores and scoreBreakdowns
 * @returns {Array} Array of player indices sorted by rank
 */
function getRankings(gameState) {
  const scores = gameState.scores || [];
  const breakdowns = gameState.scoreBreakdowns || [];
  const playerIds = (gameState.players || []).map(p => p.id);
  
  return rankPlayers(playerIds, scores, breakdowns);
}

module.exports = {
  calculateCardPoints,
  calculatePlayerScore,
  getScoreBreakdown,
  deterministicHash,
  rankPlayers,
  getWinnerIndex,
  getRankings,
};
