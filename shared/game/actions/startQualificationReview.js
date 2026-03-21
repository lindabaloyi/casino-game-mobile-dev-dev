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
 * 
 * KEY CHANGE: Keep players at their ORIGINAL indices so socket mapping stays valid
 * Instead of remapping qualifiedPlayers[0] -> 0, qualifiedPlayers[1] -> 1, etc.
 * we keep the original indices: qualifiedPlayers[0], qualifiedPlayers[1], qualifiedPlayers[2]
 * 
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for semifinal
 */
function startSemifinal(state) {
  const newState = cloneState(state);
  
  console.log('[startSemifinal] Starting semifinal phase');
  
  // Get qualified players (should already be set from qualification review)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 2).map(p => p.index);
    console.warn('[startSemifinal] Using fallback qualified players:', qualifiedPlayers);
  }
  
  const playerCount = qualifiedPlayers.length;
  const isPartyMode = newState.gameMode === 'party';
  
  // Clone the state and set up for semifinal
  const semifinalState = cloneState(newState);
  semifinalState.playerCount = playerCount;
  semifinalState.tournamentMode = newState.tournamentMode;
  semifinalState.tournamentPhase = 'SEMI_FINAL';
  semifinalState.tournamentRound = newState.tournamentRound + 1;
  semifinalState.round = 1;
  // Winner (qualifiedPlayers[0]) starts - this is their ORIGINAL index
  semifinalState.currentPlayer = qualifiedPlayers[0];
  semifinalState.turnCounter = 1;
  semifinalState.moveCount = 0;
  semifinalState.gameOver = false;
  semifinalState.gameMode = isPartyMode ? 'party' : 'three-hands';
  semifinalState.qualificationCountdown = 0;
  semifinalState.finalShowdownHandsPlayed = 0;
  semifinalState.tournamentWinner = newState.tournamentWinner;
  semifinalState.qualifiedPlayers = qualifiedPlayers;
  semifinalState.qualificationScores = newState.qualificationScores;
  semifinalState.eliminationOrder = [...newState.eliminationOrder];
  semifinalState.playerStatuses = {};
  semifinalState.tournamentScores = {};
  
  // Reset game-specific fields
  semifinalState.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  semifinalState.lastCapturePlayer = null;
  semifinalState.teamCapturedBuilds = {};
  semifinalState.shiyaRecalls = {};
  
  // Create deck and deal cards
  const { createDeck } = require('../deck');
  const deck = createDeck();
  
  // For three-hands mode: place one random card on table as initial trail
  if (playerCount === 3) {
    const trailCard = deck.splice(0, 1)[0];
    semifinalState.tableCards = [trailCard];
  } else {
    semifinalState.tableCards = deck.splice(0, 4);
  }
  
  semifinalState.deck = deck;
  
  // Filter players to only keep qualified ones, in the ORDER of qualifiedPlayers
  // This is KEY: we preserve the order [P1, P3, P0] not [P0, P1, P3]
  // This ensures players[j] corresponds to qualifiedPlayers[j]
  semifinalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const originalIndex = qualifiedPlayers[j];
    const startingCards = playerCount === 3 ? 13 : 10;
    semifinalState.players.push({
      ...newState.players[originalIndex],
      id: originalIndex, // Keep original ID/index
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
  }
  
  semifinalState.scores = new Array(playerCount).fill(0);
  
  // Create round players for turn tracking
  const { createRoundPlayers } = require('../turn');
  semifinalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses - using original indices
  for (let i = 0; i < playerCount; i++) {
    semifinalState.playerStatuses[qualifiedPlayers[i]] = 'ACTIVE';
    semifinalState.tournamentScores[qualifiedPlayers[i]] = newState.tournamentScores[qualifiedPlayers[i]] || 0;
  }
  
  console.log('[startSemifinal] Semifinal initialized - players keep original indices:', qualifiedPlayers.map(p => `P${p}`));
  console.log('[startSemifinal] Player count:', playerCount);
  console.log('[startSemifinal] Players array:', semifinalState.players.map(p => p.id));
  console.log('[startSemifinal] playerStatuses:', JSON.stringify(semifinalState.playerStatuses));
  console.log('[startSemifinal] currentPlayer:', semifinalState.currentPlayer, '(winner starts - original index)');
  
  return semifinalState;
}

/**
 * Transition from qualification review to final showdown
 * Called when countdown reaches zero after semifinal (2 players qualify)
 * 
 * Same approach as semifinal: keep original indices
 * 
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for final showdown
 */
function startFinalShowdown(state) {
  const newState = cloneState(state);
  
  console.log('[startFinalShowdown] Starting final showdown phase');
  
  // Get qualified players (should already be set from qualification review)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 2).map(p => p.index);
    console.warn('[startFinalShowdown] Using fallback qualified players:', qualifiedPlayers);
  }
  
  const playerCount = 2; // Final showdown is always 2 players
  const isPartyMode = newState.gameMode === 'party';
  
  // Clone the state
  const finalState = cloneState(newState);
  finalState.playerCount = playerCount;
  finalState.tournamentMode = newState.tournamentMode;
  finalState.tournamentPhase = 'FINAL_SHOWDOWN';
  finalState.tournamentRound = newState.tournamentRound + 1;
  finalState.round = 1;
  // Winner starts
  finalState.currentPlayer = qualifiedPlayers[0];
  finalState.turnCounter = 1;
  finalState.moveCount = 0;
  finalState.gameOver = false;
  finalState.gameMode = isPartyMode ? 'party' : 'two-hands';
  finalState.qualificationCountdown = 0;
  finalState.finalShowdownHandsPlayed = 0;
  finalState.tournamentWinner = newState.tournamentWinner;
  finalState.qualifiedPlayers = qualifiedPlayers;
  finalState.qualificationScores = newState.qualificationScores;
  finalState.eliminationOrder = [...newState.eliminationOrder];
  finalState.playerStatuses = {};
  finalState.tournamentScores = {};
  
  // Reset game-specific fields
  finalState.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  finalState.lastCapturePlayer = null;
  finalState.teamCapturedBuilds = {};
  finalState.shiyaRecalls = {};
  
  // Create deck
  const { createDeck } = require('../deck');
  const deck = createDeck();
  finalState.tableCards = deck.splice(0, 4);
  finalState.deck = deck;
  
  // Keep players at original indices, in the ORDER of qualifiedPlayers
  finalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const originalIndex = qualifiedPlayers[j];
    const startingCards = 10;
    finalState.players.push({
      ...newState.players[originalIndex],
      id: originalIndex,
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
  }
  
  finalState.scores = new Array(playerCount).fill(0);
  
  const { createRoundPlayers } = require('../turn');
  finalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses - using original indices
  for (let i = 0; i < playerCount; i++) {
    finalState.playerStatuses[qualifiedPlayers[i]] = 'ACTIVE';
    finalState.tournamentScores[qualifiedPlayers[i]] = newState.tournamentScores[qualifiedPlayers[i]] || 0;
  }
  
  console.log('[startFinalShowdown] Final showdown initialized - players keep original indices:', qualifiedPlayers.map(p => `P${p}`));
  console.log('[startFinalShowdown] currentPlayer:', finalState.currentPlayer, '(winner starts - original index)');
  
  return finalState;
}

module.exports = startQualificationReview;
module.exports.startSemifinal = startSemifinal;
module.exports.startFinalShowdown = startFinalShowdown;
module.exports.getSortedPlayersByScore = getSortedPlayersByScore;
module.exports.calculateDetailedScore = calculateDetailedScore;
