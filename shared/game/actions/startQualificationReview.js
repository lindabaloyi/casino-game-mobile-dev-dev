/**
 * startQualificationReview
 * Initiates the qualification review phase after qualifying rounds.
 * Determines top 2 qualified players, calculates score breakdowns,
 * and starts the countdown to semifinal.
 */

const { cloneState, initializeGame, calculatePlayerScore, getScoreBreakdown } = require('../');

/**
 * Get players sorted by tournament score (descending)
 * @param {Object} state - Game state
 * @returns {Array} Sorted array of player objects with index and score
 */
function getSortedPlayersByScore(state) {
  const players = [];
  
  for (let i = 0; i < state.playerCount; i++) {
    if (state.playerStatuses[i] === 'ACTIVE') {
      players.push({
        index: i,
        score: state.tournamentScores[i] || 0,
        captures: state.players[i].captures || [],
      });
    }
  }
  
  // Sort by score descending, then by index ascending for tiebreakers
  players.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.index - b.index;
  });
  
  return players;
}

/**
 * Calculate detailed score breakdown for a player
 * @param {Array} captures - Array of captured cards
 * @returns {Object} Detailed score breakdown
 */
function calculateDetailedScore(captures) {
  const breakdown = getScoreBreakdown(captures);
  
  // Extract individual components from the breakdown
  const cardPoints = breakdown.cardPoints;
  const spadeBonus = breakdown.spadeBonus;
  const cardCountBonus = breakdown.cardCountBonus;
  
  // Calculate individual card contributions
  let tenDiamondPoints = 0;
  let twoSpadePoints = 0;
  let acePoints = 0;
  
  if (captures && Array.isArray(captures)) {
    for (const card of captures) {
      // 10 of diamonds = 2 points
      if (card.rank === '10' && card.suit === '♦') {
        tenDiamondPoints += 2;
      }
      // 2 of spades = 1 point
      else if (card.rank === '2' && card.suit === '♠') {
        twoSpadePoints += 1;
      }
      // Aces = 1 point each
      else if (card.rank === 'A') {
        acePoints += 1;
      }
    }
  }
  
  return {
    totalPoints: breakdown.totalScore,
    cardPoints: cardPoints,
    tenDiamondPoints: tenDiamondPoints,
    twoSpadePoints: twoSpadePoints,
    acePoints: acePoints,
    spadeBonus: spadeBonus,
    cardCountBonus: cardCountBonus,
  };
}

/**
 * Start the qualification review phase
 * @param {Object} state - Current game state
 * @param {number} qualifiedCount - Number of players to qualify (3 for semifinal, 2 for final)
 * @returns {Object} Updated state with qualification review data
 */
function startQualificationReview(state, qualifiedCount = 3) {
  const newState = cloneState(state);
  
  console.log(`[startQualificationReview] Starting qualification review phase - ${qualifiedCount} players qualify`);
  
  // Get sorted players by score
  const sortedPlayers = getSortedPlayersByScore(newState);
  
  if (sortedPlayers.length < qualifiedCount) {
    console.warn(`[startQualificationReview] Not enough players for qualification (${qualifiedCount}), proceeding to next phase`);
    // If less than qualifiedCount players, proceed directly
    return qualifiedCount === 2 ? startFinalShowdown(newState) : startSemifinal(newState);
  }
  
  // Get top qualifiedCount players
  const qualified = sortedPlayers.slice(0, qualifiedCount);
  
  console.log('[startQualificationReview] Qualified players:', qualified.map(p => `P${p.index} (${p.score} pts)`));
  
  // Calculate detailed score breakdowns for qualified players
  const qualificationScores = {};
  const qualifiedPlayers = [];
  
  for (let rank = 0; rank < qualified.length; rank++) {
    const player = qualified[rank];
    const playerIndex = player.index;
    
    qualifiedPlayers.push(playerIndex);
    qualificationScores[playerIndex] = calculateDetailedScore(player.captures);
    qualificationScores[playerIndex].rank = rank + 1; // 1st or 2nd place
    
    console.log(`[startQualificationReview] Player ${playerIndex} (Rank ${rank + 1}):`, qualificationScores[playerIndex]);
  }
  
  // Set qualification review state
  newState.tournamentPhase = 'QUALIFICATION_REVIEW';
  newState.qualifiedPlayers = qualifiedPlayers;
  newState.qualificationScores = qualificationScores;
  newState.qualificationCountdown = 10; // 10 seconds
  newState.gameOver = false; // Allow actions during qualification review
  
  console.log('[startQualificationReview] Qualification review started with 10 second countdown');
  
  return newState;
}

/**
 * Transition from qualification review to semifinal
 * Called when countdown reaches zero
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for semifinal
 */
function startSemifinal(state) {
  const newState = cloneState(state);
  
  console.log('[startSemifinal] Starting semifinal phase');
  
  // Get qualified players (should already be set from qualification review)
  const qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    const top2 = sortedPlayers.slice(0, 2);
    newState.qualifiedPlayers = top2.map(p => p.index);
    console.warn('[startSemifinal] Using fallback qualified players:', newState.qualifiedPlayers);
  }
  
  // Reset game state for semifinal with only qualified players
  const playerCount = newState.qualifiedPlayers.length;
  const isPartyMode = newState.gameMode === 'party';
  
  // Initialize new game state for semifinal
  const semifinalState = initializeGame(playerCount, isPartyMode);
  
  // Copy over tournament state
  semifinalState.tournamentMode = newState.tournamentMode;
  semifinalState.tournamentPhase = 'SEMI_FINAL';
  semifinalState.tournamentRound = newState.tournamentRound + 1;
  semifinalState.playerStatuses = { ...newState.playerStatuses };
  semifinalState.tournamentScores = { ...newState.tournamentScores };
  semifinalState.eliminationOrder = [...newState.eliminationOrder];
  semifinalState.finalShowdownHandsPlayed = newState.finalShowdownHandsPlayed;
  semifinalState.tournamentWinner = newState.tournamentWinner;
  semifinalState.qualifiedPlayers = newState.qualifiedPlayers;
  semifinalState.qualificationScores = newState.qualificationScores;
  
  // Map qualified player indices to 0, 1 for new game state
  const playerMapping = {};
  for (let i = 0; i < newState.qualifiedPlayers.length; i++) {
    playerMapping[newState.qualifiedPlayers[i]] = i;
  }
  
  // Update player statuses for semifinal
  for (let i = 0; i < semifinalState.playerCount; i++) {
    const originalIndex = newState.qualifiedPlayers[i];
    semifinalState.playerStatuses[i] = 'ACTIVE';
    // Preserve scores from qualification
    semifinalState.tournamentScores[i] = newState.tournamentScores[originalIndex] || 0;
  }
  
  // Mark eliminated players
  for (let i = 0; i < newState.playerCount; i++) {
    if (!newState.qualifiedPlayers.includes(i)) {
      semifinalState.playerStatuses[i] = 'ELIMINATED';
    }
  }
  
  console.log('[startSemifinal] Semifinal initialized with players:', newState.qualifiedPlayers.map((p, i) => `P${p}->P${i}`));
  
  return semifinalState;
}

/**
 * Transition from qualification review to final showdown
 * Called when countdown reaches zero after semifinal (2 players qualify)
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for final showdown
 */
function startFinalShowdown(state) {
  const newState = cloneState(state);
  
  console.log('[startFinalShowdown] Starting final showdown phase');
  
  // Get qualified players (should already be set from qualification review)
  const qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    const top2 = sortedPlayers.slice(0, 2);
    newState.qualifiedPlayers = top2.map(p => p.index);
    console.warn('[startFinalShowdown] Using fallback qualified players:', newState.qualifiedPlayers);
  }
  
  // Reset game state for final showdown with only 2 qualified players
  const playerCount = 2; // Final showdown is always 2 players
  const isPartyMode = newState.gameMode === 'party';
  
  // Initialize new game state for final showdown
  const finalState = initializeGame(playerCount, isPartyMode);
  
  // Copy over tournament state
  finalState.tournamentMode = newState.tournamentMode;
  finalState.tournamentPhase = 'FINAL_SHOWDOWN';
  finalState.tournamentRound = newState.tournamentRound + 1;
  finalState.playerStatuses = { ...newState.playerStatuses };
  finalState.tournamentScores = { ...newState.tournamentScores };
  finalState.eliminationOrder = [...newState.eliminationOrder];
  finalState.finalShowdownHandsPlayed = 0;
  finalState.tournamentWinner = newState.tournamentWinner;
  finalState.qualifiedPlayers = newState.qualifiedPlayers;
  finalState.qualificationScores = newState.qualificationScores;
  
  // Map qualified player indices to 0, 1 for new game state
  for (let i = 0; i < finalState.playerCount; i++) {
    const originalIndex = newState.qualifiedPlayers[i];
    finalState.playerStatuses[i] = 'ACTIVE';
    // Preserve scores from qualification
    finalState.tournamentScores[i] = newState.tournamentScores[originalIndex] || 0;
  }
  
  // Mark eliminated players
  for (let i = 0; i < newState.playerCount; i++) {
    if (!newState.qualifiedPlayers.includes(i)) {
      finalState.playerStatuses[i] = 'ELIMINATED';
    }
  }
  
  console.log('[startFinalShowdown] Final showdown initialized with players:', newState.qualifiedPlayers.map((p, i) => `P${p}->P${i}`));
  
  return finalState;
}

module.exports = startQualificationReview;
module.exports.startSemifinal = startSemifinal;
module.exports.startFinalShowdown = startFinalShowdown;
module.exports.getSortedPlayersByScore = getSortedPlayersByScore;
module.exports.calculateDetailedScore = calculateDetailedScore;
