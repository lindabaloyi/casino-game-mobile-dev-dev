/**
 * Casino Scoring System
 * Calculates points based on captured cards with specific rules
 */

// Simple console-based logger
const logger = {
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
 * @param {string} gameType - 'standard', 'three-hands', or 'party' (default: 'standard')
 * @returns {number} Total score for the player
 */
function calculatePlayerScore(capturedCards, gameType = 'standard') {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return 0;
  }

  const isThreeHands = gameType === 'three-hands';

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

  // 3. Spades bonus: NOT included for three-hands mode
  if (!isThreeHands && spadeCount >= 6) {
    score += 2;
  }

  // 4. Card count bonuses: NOT included for three-hands mode
  if (!isThreeHands) {
    if (totalCards >= 21) {
      score += 2;
    } else if (totalCards === 20) {
      score += 1;
    }
  }

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
 * @param {Array} scores - [player0Score, player1Score] or for 3+ players
 * @param {number} playerCount - Number of players (2, 3, or 4)
 * @param {Array} teamScores - [teamAScore, teamBScore] for 4-player mode
 * @returns {number|null} Winner player index (0, 1, 2) or null for tie, or 'A'/'B' for team wins
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
  
  // 2-player or 3-player mode
  if (!scores || scores.length < 2) {
    logger.error("Invalid scores array for winner determination", { scores });
    return null;
  }

  const [p0Score, p1Score] = scores;
  
  // 3-player mode: find highest score
  if (playerCount === 3 && scores.length === 3) {
    const p2Score = scores[2];
    const maxScore = Math.max(p0Score, p1Score, p2Score);
    const winners = scores.reduce((acc, score, idx) => {
      if (score === maxScore) acc.push(idx);
      return acc;
    }, []);
    
    if (winners.length === 1) {
      logger.info(`🏆 Player ${winners[0]} wins with ${maxScore} points vs ${p0Score}, ${p1Score}, ${p2Score}`);
      return winners[0];
    } else {
      logger.info(`🤝 Tie game: Players ${winners.join(', ')} have ${maxScore} points`);
      return null; // Tie between 2 or 3 players
    }
  }
  
  // 2-player mode
  if (p0Score > p1Score) {
    logger.info(`🏆 Player 0 wins with ${p0Score} points vs ${p1Score}`);
    return 0;
  } else if (p1Score > p0Score) {
    logger.info(`🏆 Player 1 wins with ${p1Score} points vs ${p0Score}`);
    return 1;
  } else {
    logger.info(`🤝 Tie game: Both players have ${p0Score} points`);
    return null; // Tie game - use tie-breaking functions instead
  }
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
    
    // Create card ID string for deterministic hash
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
  
  // Sort by: higher score -> more spades -> more cards -> hash
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

  // Determine gameType for scoring (three-hands uses base points only, no bonuses)
  const isThreeHands = playerCount === 3;
  const isPartyMode = playerCount === 4 && players.some(p => p.team);
  const gameType = isThreeHands ? 'three-hands' : (isPartyMode ? 'party' : 'standard');

  // Calculate per-player scores (pass gameType to exclude bonuses for three-hands)
  const perPlayerScores = players.map(p => 
    calculatePlayerScore(p.captures || [], gameType)
  );
  gameState.scores = perPlayerScores;
  
  // Calculate team scores for 4-player party mode only (when teams exist)
  if (playerCount === 4 && isPartyMode) {
    const teamScores = calculateTeamScores(players);
    gameState.teamScores = teamScores;
    
    // Determine team winner
    gameState.winner = determineWinner(perPlayerScores, playerCount, teamScores);
    
    logger.info(`📊 Scores updated: [${perPlayerScores.join(', ')}], Teams: [${teamScores.join(', ')}], Winner: ${gameState.winner !== null ? `Team ${gameState.winner}` : 'Tie'}`);
  } else if (playerCount === 3) {
    // 3-player mode: each player for themselves
    gameState.winner = determineWinner(perPlayerScores, playerCount);
    
    logger.info(`📊 Scores updated: [${perPlayerScores.join(', ')}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  } else if (playerCount === 4) {
    // 4-player free-for-all: each player for themselves
    gameState.winner = determineWinner(perPlayerScores, playerCount);
    gameState.teamScores = null; // No team scores for free-for-all
    
    logger.info(`📊 Scores updated (4-player free-for-all): [${perPlayerScores.join(', ')}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  } else {
    // 2-player mode
    const newScores = calculateFinalScores(players.map(p => p.captures || []));
    gameState.scores = newScores;
    gameState.winner = determineWinner(newScores, playerCount);
    
    logger.info(`📊 Scores updated: [${newScores[0]}, ${newScores[1]}], Winner: ${gameState.winner !== null ? `Player ${gameState.winner}` : 'Tie'}`);
  }

  return gameState;
}

/**
 * Get detailed score breakdown for a player
 * @param {Array} capturedCards - Array of captured card objects
 * @param {string} gameType - 'standard', 'three-hands', or 'party' (default: 'standard')
 * @returns {Object} Detailed breakdown of score components
 */
function getScoreBreakdown(capturedCards, gameType = 'standard') {
  if (!capturedCards || !Array.isArray(capturedCards)) {
    return {
      totalCards: 0,
      spadeCount: 0,
      cardPoints: 0,
      spadeBonus: 0,
      cardCountBonus: 0,
      totalScore: 0,
      cards: [],
      // Detailed breakdown by card type
      tenDiamondCount: 0,
      tenDiamondPoints: 0,
      twoSpadeCount: 0,
      twoSpadePoints: 0,
      aceCount: 0,
      acePoints: 0,
    };
  }

  const isThreeHands = gameType === 'three-hands';

  // Count specific cards for detailed breakdown
  const tenDiamondCards = capturedCards.filter(
    (card) => card && card.rank === "10" && card.suit === "♦"
  );
  const twoSpadeCards = capturedCards.filter(
    (card) => card && card.rank === "2" && card.suit === "♠"
  );
  const aceCards = capturedCards.filter(
    (card) => card && card.rank === "A"
  );

  const tenDiamondCount = tenDiamondCards.length;
  const tenDiamondPoints = tenDiamondCount * 2; // 10♦ = 2 points each

  const twoSpadeCount = twoSpadeCards.length;
  const twoSpadePoints = twoSpadeCount * 1; // 2♠ = 1 point each

  const aceCount = aceCards.length;
  const acePoints = aceCount * 1; // Ace = 1 point each

  // Count spades
  const spadeCount = capturedCards.filter(
    (card) => card && card.suit === "♠"
  ).length;

  // Count total cards
  const totalCards = capturedCards.length;

  // Calculate card points (sum of all individual card points)
  const cardPoints = capturedCards.reduce((sum, card) => {
    if (!card || typeof card !== "object") return sum;
    return sum + calculateCardPoints(card);
  }, 0);

  // Calculate bonuses (NOT included for three-hands mode)
  let spadeBonus = 0;
  let cardCountBonus = 0;

  if (!isThreeHands) {
    if (spadeCount >= 6) {
      spadeBonus = 2;
    }

    if (totalCards >= 21) {
      cardCountBonus = 2;
    } else if (totalCards === 20) {
      cardCountBonus = 1;
    }
  }

  // Format cards for display
  const formattedCards = capturedCards.map(card => {
    if (!card) return null;
    const suitSymbols = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };
    const suitSymbol = suitSymbols[card.suit] || card.suit;
    return {
      rank: card.rank,
      suit: card.suit,
      value: card.value,
      display: `${card.rank} ${suitSymbol}`,
      points: calculateCardPoints(card),
    };
  }).filter(Boolean);

  // Total score: base points only for three-hands
  const totalScore = isThreeHands ? cardPoints : cardPoints + spadeBonus + cardCountBonus;

  return {
    totalCards,
    spadeCount,
    cardPoints,
    spadeBonus,
    cardCountBonus,
    totalScore,
    cards: formattedCards,
    // Detailed breakdown by card type
    tenDiamondCount,
    tenDiamondPoints,
    twoSpadeCount,
    twoSpadePoints,
    aceCount,
    acePoints,
  };
}

/**
 * Get detailed team score breakdown aggregating players on each team
 * @param {Array} players - Array of player objects with captures
 * @returns {Object} Team score breakdowns for Team A and Team B
 */
function getTeamScoreBreakdown(players) {
  if (!players || !Array.isArray(players)) {
    return {
      teamA: getEmptyTeamBreakdown(),
      teamB: getEmptyTeamBreakdown(),
    };
  }

  // Get all cards for each team
  const teamACards = [];
  const teamBCards = [];
  const playerBreakdowns = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const captures = player?.captures || [];
    const playerBreakdown = getScoreBreakdown(captures);
    playerBreakdowns.push(playerBreakdown);

    // Determine team
    const team = player?.team || (i < 2 ? 'A' : 'B');
    
    if (team === 'A') {
      teamACards.push(...captures);
    } else {
      teamBCards.push(...captures);
    }
  }

  // Calculate team totals
  const teamABreakdown = calculateTeamTotalBreakdown(teamACards);
  const teamBBreakdown = calculateTeamTotalBreakdown(teamBCards);

  return {
    teamA: {
      ...teamABreakdown,
      players: [
        { playerIndex: 0, ...playerBreakdowns[0] },
        { playerIndex: 1, ...playerBreakdowns[1] },
      ],
    },
    teamB: {
      ...teamBBreakdown,
      players: [
        { playerIndex: 2, ...playerBreakdowns[2] },
        { playerIndex: 3, ...playerBreakdowns[3] },
      ],
    },
  };
}

function getEmptyTeamBreakdown() {
  return {
    totalCards: 0,
    spadeCount: 0,
    cardPoints: 0,
    spadeBonus: 0,
    cardCountBonus: 0,
    totalScore: 0,
    tenDiamondCount: 0,
    tenDiamondPoints: 0,
    twoSpadeCount: 0,
    twoSpadePoints: 0,
    aceCount: 0,
    acePoints: 0,
    players: [],
  };
}

function calculateTeamTotalBreakdown(cards) {
  // Count specific cards
  const tenDiamondCount = cards.filter(
    (c) => c && c.rank === "10" && c.suit === "♦"
  ).length;
  const twoSpadeCount = cards.filter(
    (c) => c && c.rank === "2" && c.suit === "♠"
  ).length;
  const aceCount = cards.filter((c) => c && c.rank === "A").length;

  // Calculate points
  const tenDiamondPoints = tenDiamondCount * 2;
  const twoSpadePoints = twoSpadeCount * 1;
  const acePoints = aceCount * 1;
  const cardPoints = tenDiamondPoints + twoSpadePoints + acePoints;

  // Count spades
  const spadeCount = cards.filter((c) => c && c.suit === "♠").length;
  const totalCards = cards.length;

  // Calculate bonuses (team-based)
  let spadeBonus = 0;
  let cardCountBonus = 0;

  // In team mode: 6+ spades = +2 for the team
  if (spadeCount >= 6) {
    spadeBonus = 2;
  }

  // Team card bonus: 20+ cards = +2, exactly 20 = +1
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
    tenDiamondCount,
    tenDiamondPoints,
    twoSpadeCount,
    twoSpadePoints,
    aceCount,
    acePoints,
  };
}

module.exports = {
  calculateCardPoints,
  calculatePlayerScore,
  calculateFinalScores,
  calculateTeamScores,
  determineWinner,
  updateScores,
  getScoreBreakdown,
  getTeamScoreBreakdown,
  deterministicHash,
  rankPlayers,
  getWinnerIndex,
  getRankings,
};