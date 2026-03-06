/**
 * Casino Scoring System
 * Calculates points based on captured cards with specific rules
 */

// Simple console-based logger
const logger = {
  debug: (...args) => console.log('[Scoring] DEBUG:', ...args),
  info: (...args) => console.log('[Scoring] INFO:', ...args),
  warn: (...args) => console.warn('[Scoring] WARN:', ...args),
  error: (...args) => console.error('[Scoring] ERROR:', ...args),
};

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

  // 4. Card count bonuses:
  //    - 21 or more cards → 2 points
  //    - Exactly 20 cards   → 1 point
  if (totalCards >= 21) {
    score += 2;
    logger.debug(`🃏 Card count bonus: ${totalCards} cards ≥ 21, +2 points`);
  } else if (totalCards === 20) {
    score += 1;
    logger.debug(`🃏 Card count bonus: exactly 20 cards, +1 point`);
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
 * Calculate final scores for both players (2‑player mode)
 * @param {Array} playerCaptures - Array of [player0Captures, player1Captures]
 * @returns {Array} [player0Score, player1Score]
 */
function calculateFinalScores(playerCaptures) {
  if (
    !playerCaptures ||
    !Array.isArray(playerCaptures) ||
    playerCaptures.length < 2
  ) {
    logger.error("Invalid playerCaptures array", { playerCaptures });
    return [0, 0];
  }

  const [p0Cards, p1Cards] = playerCaptures;

  const p0Score = calculatePlayerScore(p0Cards || []);
  const p1Score = calculatePlayerScore(p1Cards || []);

  const totalScore = p0Score + p1Score;
  const expectedTotal = 11;

  if (totalScore !== expectedTotal) {
    logger.warn(
      `⚠️ Score total mismatch: ${totalScore} (expected ${expectedTotal})`,
      {
        p0Score,
        p1Score,
        p0Cards: (p0Cards || []).length,
        p1Cards: (p1Cards || []).length,
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
 * Calculate team scores from all players' captures
 * @param {Array} players - Array of player objects with captures
 * @returns {Array} [teamAScore, teamBScore]
 */
function calculateTeamScores(players) {
  if (!players || !Array.isArray(players)) {
    return [0, 0];
  }

  let teamAScore = 0;
  let teamBScore = 0;

  for (const player of players) {
    if (!player || !player.captures) continue;
    
    const playerScore = calculatePlayerScore(player.captures);
    const team = player.team || (player.id < 2 ? 'A' : 'B');
    
    if (team === 'A') {
      teamAScore += playerScore;
    } else {
      teamBScore += playerScore;
    }
  }

  // Team bonuses - in 2v2, both teammates' bonuses count
  // Check if any team has enough cards for the 20-card bonus
  const teamACards = players
    .filter(p => (p.team || (p.id < 2 ? 'A' : 'B')) === 'A')
    .reduce((sum, p) => sum + (p.captures?.length || 0), 0);
  const teamBCards = players
    .filter(p => (p.team || (p.id < 2 ? 'A' : 'B')) === 'B')
    .reduce((sum, p) => sum + (p.captures?.length || 0), 0);

  if (teamACards >= 20) {
    teamAScore += 1;
    logger.info(`🎯 Team A 20-card bonus: +1 point`);
  }
  if (teamBCards >= 20) {
    teamBScore += 1;
    logger.info(`🎯 Team B 20-card bonus: +1 point`);
  }

  logger.info(`📊 Team scores: Team A = ${teamAScore}, Team B = ${teamBScore}`);
  return [teamAScore, teamBScore];
}

/**
 * Determine the winner based on final scores
 * @param {Array} scores - [player0Score, player1Score]
 * @param {number} playerCount - Number of players (2 or 4)
 * @param {Array} teamScores - [teamAScore, teamBScore] for 4-player mode
 * @returns {number|null} Winner player index (0 or 1) or null for tie, or 'A'/'B' for team wins
 */
function determineWinner(scores, playerCount = 2, teamScores = null) {
  // For 4-player mode, determine team winner
  if (playerCount === 4 && teamScores && teamScores.length === 2) {
    const [teamAScore, teamBScore] = teamScores;
    if (teamAScore > teamBScore) {
      logger.info(`🏆 Team A wins with ${teamAScore} points vs ${teamBScore}`);
      return 'A';
    } else if (teamBScore > teamAScore) {
      logger.info(`🏆 Team B wins with ${teamBScore} points vs ${teamAScore}`);
      return 'B';
    } else {
      logger.info(`🤝 Team tie: Both teams have ${teamAScore} points`);
      return null;
    }
  }
  
  // 2-player mode
  if (!scores || scores.length !== 2) {
    logger.error("Invalid scores array for winner determination", { scores });
    return null;
  }

  const [p0Score, p1Score] = scores;

  if (p0Score > p1Score) {
    logger.info(`🏆 Player 0 wins with ${p0Score} points vs ${p1Score}`);
    return 0;
  } else if (p1Score > p0Score) {
    logger.info(`🏆 Player 1 wins with ${p1Score} points vs ${p0Score}`);
    return 1;
  } else {
    logger.info(`🤝 Tie game: Both players have ${p0Score} points`);
    return null; // Tie game
  }
}

/**
 * Update scores and determine winner in game state
 * @param {Object} gameState - Game state object
 * @returns {Object} Updated game state with new scores and winner
 */
function updateScores(gameState) {
  if (!gameState) {
    logger.error("No game state provided for score update");
    return gameState;
  }

  const players = gameState.players || [];
  const playerCount = gameState.playerCount || players.length;

  // Calculate per-player scores
  const perPlayerScores = players.map(p => 
    calculatePlayerScore(p.captures || [])
  );
  gameState.scores = perPlayerScores;

  // Calculate team scores for 4-player mode
  if (playerCount === 4) {
    const teamScores = calculateTeamScores(players);
    gameState.teamScores = teamScores;
    
    // Determine team winner
    gameState.winner = determineWinner(perPlayerScores, playerCount, teamScores);
    
    logger.info(`📊 Scores updated: [${perPlayerScores.join(', ')}], Teams: [${teamScores.join(', ')}], Winner: ${gameState.winner !== null ? `Team ${gameState.winner}` : 'Tie'}`);
  } else {
    // 2-player mode
    const newScores = calculateFinalScores(players.map(p => p.captures || []));
    gameState.scores = newScores;
    gameState.winner = determineWinner(newScores, playerCount);
    
    logger.info(`📊 Scores updated: [${newScores[0]}, ${newScores[1]}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  }

  return gameState;
}

module.exports = {
  calculateCardPoints,
  calculatePlayerScore,
  calculateFinalScores,
  calculateTeamScores,
  determineWinner,
  updateScores,
};
