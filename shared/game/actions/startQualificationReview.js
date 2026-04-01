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
  
  // FIX: Update playerStatuses to only include active players with correct indices
  // This ensures getSortedPlayersByScore correctly identifies all active players
  // when transitioning between tournament rounds where playerCount may have changed
  // IMPORTANT: Preserve ELIMINATED status for eliminated players
  const activePlayerIndices = [];
  const eliminatedPlayerIndices = [];
  
  for (let i = 0; i < newState.playerCount; i++) {
    if (newState.playerStatuses[i] === 'ACTIVE') {
      activePlayerIndices.push(i);
    } else if (newState.playerStatuses[i] === 'ELIMINATED') {
      eliminatedPlayerIndices.push(i);
    }
  }
  
  // Get sorted players by score
  const sortedPlayers = getSortedPlayersByScore(newState);
  
  if (sortedPlayers.length < qualifiedCount) {
    console.warn(`[startQualificationReview] Not enough players for qualification (${qualifiedCount}), proceeding to next phase`);
    // If less than qualifiedCount players, proceed directly
    return qualifiedCount === 2 ? startFinalShowdown(newState) : startSemifinal(newState);
  }
  
  // CRITICAL: Sort qualified players by their ORIGINAL indices for consistent ordering
  // This ensures the players array in semifinal will have deterministic indices
  const qualified = sortedPlayers.slice(0, qualifiedCount);
  const qualifiedSortedByIndex = [...qualified].sort((a, b) => a.index - b.index);
  
  console.log('[startQualificationReview] Qualified players:', qualified.map(p => `P${p.index} (${p.score} pts)`));
  
  // Calculate detailed score breakdowns for qualified players
  // Use the sorted-by-index array for consistent player ordering
  const qualificationScores = {};
  const qualifiedPlayers = [];
  
  for (let rank = 0; rank < qualifiedSortedByIndex.length; rank++) {
    const player = qualifiedSortedByIndex[rank];
    const playerIndex = player.index;
    
    qualifiedPlayers.push(playerIndex);
    qualificationScores[playerIndex] = calculateDetailedScore(player.captures);
    qualificationScores[playerIndex].rank = rank + 1; // 1st or 2nd place
    
    console.log(`[startQualificationReview] Player ${playerIndex} (Rank ${rank + 1}):`, qualificationScores[playerIndex]);
  }
  
  // CRITICAL FIX: Set playerStatuses - qualified = ACTIVE, not qualified = ELIMINATED
  const qualifiedSet = new Set(qualifiedPlayers);
  
  // Build new playerStatuses
  const finalPlayerStatuses = {};
  
  // Set qualified players to ACTIVE
  for (const playerIndex of qualifiedPlayers) {
    finalPlayerStatuses[playerIndex] = 'ACTIVE';
  }
  
  // Set non-qualified active players to ELIMINATED
  for (const playerIndex of activePlayerIndices) {
    if (!qualifiedSet.has(playerIndex)) {
      finalPlayerStatuses[playerIndex] = 'ELIMINATED';
      console.log(`[startQualificationReview] Eliminating non-qualified player ${playerIndex}`);
    }
  }
  
  // Preserve previously eliminated players
  for (const playerIndex of eliminatedPlayerIndices) {
    finalPlayerStatuses[playerIndex] = 'ELIMINATED';
  }
  
  newState.playerStatuses = finalPlayerStatuses;
  
  console.log(`[startQualificationReview] Final playerStatuses:`, JSON.stringify(newState.playerStatuses));
  console.log(`[startQualificationReview] Qualified players:`, qualifiedPlayers);
  console.log(`[startQualificationReview] Eliminated players:`, Object.entries(finalPlayerStatuses).filter(([k,v]) => v === 'ELIMINATED').map(([k]) => k));
  
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
  console.log('[startSemifinal] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
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
  // Winner (qualifiedPlayers[0]) starts - use NEW index 0, not original index
  // CRITICAL FIX: currentPlayer must be new index, not original index
  semifinalState.currentPlayer = 0;
  console.log('[startSemifinal] currentPlayer set to: 0 (winner at new index 0)');
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
  
  // Filter players to only keep qualified ones, assign NEW indices 0,1,2
  // This ensures players array indices match socket remapped indices
  semifinalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const originalIndex = qualifiedPlayers[j];
    const startingCards = playerCount === 3 ? 13 : 10;
    semifinalState.players.push({
      ...newState.players[originalIndex],
      id: j, // Use NEW index, not original index
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
    console.log(`[startSemifinal] Created player at new index ${j} from original player ${originalIndex}`);
  }
  
  semifinalState.scores = new Array(playerCount).fill(0);
  
  // Create round players for turn tracking
  const { createRoundPlayers } = require('../turn');
  semifinalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses - using original indices
  // IMPORTANT: Preserve ELIMINATED status for players who didn't qualify
  for (let i = 0; i < playerCount; i++) {
    const origIdx = qualifiedPlayers[i];
    semifinalState.playerStatuses[origIdx] = 'ACTIVE';
    semifinalState.tournamentScores[origIdx] = newState.tournamentScores[origIdx] || 0;
    console.log(`[startSemifinal] Setting playerStatuses[${origIdx}] = 'ACTIVE', tournamentScores[${origIdx}] = ${semifinalState.tournamentScores[origIdx]}`);
  }
  
  // Preserve ELIMINATED status for players who didn't qualify for semifinal
  for (let i = 0; i < newState.playerCount; i++) {
    if (!qualifiedPlayers.includes(i) && newState.playerStatuses[i] === 'ELIMINATED') {
      semifinalState.playerStatuses[i] = 'ELIMINATED';
      console.log(`[startSemifinal] Preserving ELIMINATED status for player ${i}`);
    }
  }
  
  console.log('[startSemifinal] Players array (NEW indices):', semifinalState.players.map(p => p.id));
  console.log('[startSemifinal] Final playerStatuses:', JSON.stringify(semifinalState.playerStatuses));
  console.log('[startSemifinal] Final tournamentScores:', JSON.stringify(semifinalState.tournamentScores));
  console.log('[startSemifinal] Player count:', playerCount);
  console.log('[startSemifinal] Players array:', semifinalState.players.map(p => p.id));
  console.log('[startSemifinal] playerStatuses:', JSON.stringify(semifinalState.playerStatuses));
  console.log('[startSemifinal] currentPlayer:', semifinalState.currentPlayer, '(winner starts - original index)');
  console.log('[startSemifinal] AFTER - players.length:', semifinalState.players?.length, ', playerCount:', semifinalState.playerCount);
  
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
  console.log('[startFinalShowdown] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
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
  // Winner starts - use NEW index 0, not original index
  // CRITICAL FIX: currentPlayer must be new index, not original index
  finalState.currentPlayer = 0;
  console.log('[startFinalShowdown] currentPlayer set to: 0 (winner at new index 0)');
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
  
  // Keep players at NEW indices 0,1 (matching remapped socket indices)
  finalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const originalIndex = qualifiedPlayers[j];
    const startingCards = 10;
    finalState.players.push({
      ...newState.players[originalIndex],
      id: j, // Use NEW index, not original index
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
    console.log(`[startFinalShowdown] Created player at new index ${j} from original player ${originalIndex}`);
  }
  
  finalState.scores = new Array(playerCount).fill(0);
  
  const { createRoundPlayers } = require('../turn');
  finalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses - using original indices
  for (let i = 0; i < playerCount; i++) {
    const origIdx = qualifiedPlayers[i];
    finalState.playerStatuses[origIdx] = 'ACTIVE';
    finalState.tournamentScores[origIdx] = newState.tournamentScores[origIdx] || 0;
    console.log(`[startFinalShowdown] Setting playerStatuses[${origIdx}] = 'ACTIVE', tournamentScores[${origIdx}] = ${finalState.tournamentScores[origIdx]}`);
  }
  
  console.log('[startFinalShowdown] Players array (NEW indices):', finalState.players.map(p => p.id));
  console.log('[startFinalShowdown] Final playerStatuses:', JSON.stringify(finalState.playerStatuses));
  console.log('[startFinalShowdown] Final tournamentScores:', JSON.stringify(finalState.tournamentScores));
  console.log('[startFinalShowdown] currentPlayer:', finalState.currentPlayer, '(winner starts - original index)');
  console.log('[startFinalShowdown] AFTER - players.length:', finalState.players?.length, ', playerCount:', finalState.playerCount);
  
  return finalState;
}

module.exports = startQualificationReview;
module.exports.startSemifinal = startSemifinal;
module.exports.startFinalShowdown = startFinalShowdown;
module.exports.getSortedPlayersByScore = getSortedPlayersByScore;
module.exports.calculateDetailedScore = calculateDetailedScore;
