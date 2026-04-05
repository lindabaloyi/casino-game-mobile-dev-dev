/**
 * startQualificationReview
 * Initiates the qualification review phase after qualifying rounds.
 * Determines top 2 qualified players, calculates score breakdowns,
 * and starts the countdown to semifinal.
 * 
 * IMPORTANT: Now uses playerId strings (e.g., 'player_0') instead of numeric indices!
 */

const { cloneState, initializeGame, calculatePlayerScore, getScoreBreakdown } = require('../');

/**
 * Get players sorted by tournament score (descending)
 * IMPORTANT: Uses playerId strings!
 * @param {Object} state - Game state
 * @returns {Array} Sorted array of player objects with playerId and score
 */
function getSortedPlayersByScore(state) {
  const players = [];
  
  console.log(`[getSortedPlayersByScore] playerCount: ${state.playerCount}`);
  console.log(`[getSortedPlayersByScore] playerStatuses (playerId strings): ${JSON.stringify(state.playerStatuses)}`);
  
  for (let i = 0; i < state.playerCount; i++) {
    const playerId = state.players[i].id;  // Get playerId string (e.g., 'player_0')
    
    // Check status using the playerId string
    if (state.playerStatuses[playerId] === 'ACTIVE') {
      players.push({
        playerId: playerId,  // Use playerId string, not index!
        score: state.tournamentScores[playerId] || 0,
        captures: state.players[i].captures || [],
      });
      console.log(`[getSortedPlayersByScore] Player ${playerId}: score=${state.tournamentScores[playerId] || 0}`);
    }
  }
  
  // Sort by score descending, then by playerId for tiebreakers
  players.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.playerId.localeCompare(b.playerId);
  });
  
  console.log(`[getSortedPlayersByScore] Sorted:`, players.map(p => `${p.playerId}(${p.score})`));
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
  let spadeCount = 0;
  const totalCards = captures?.length || 0;
  
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
      // Count spades
      if (card.suit === '♠') {
        spadeCount++;
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
    spadeCount: spadeCount,
    totalCards: totalCards,
  };
}

/**
 * Start the qualification review phase
 * IMPORTANT: Uses playerId strings throughout!
 * @param {Object} state - Current game state
 * @param {number} qualifiedCount - Number of players to qualify (3 for semifinal, 2 for final)
 * @returns {Object} Updated state with qualification review data
 */
function startQualificationReview(state, qualifiedCount = 3) {
  const newState = cloneState(state);
  
  console.log(`[startQualificationReview] Starting qualification review phase - ${qualifiedCount} players qualify`);
  
  // Get active and eliminated player IDs (playerId strings)
  const activePlayerIds = [];
  const eliminatedPlayerIds = [];
  
  for (let i = 0; i < newState.playerCount; i++) {
    const playerId = newState.players[i].id;
    if (newState.playerStatuses[playerId] === 'ACTIVE') {
      activePlayerIds.push(playerId);
    } else if (newState.playerStatuses[playerId] === 'ELIMINATED') {
      eliminatedPlayerIds.push(playerId);
    }
  }
  
  console.log(`[startQualificationReview] Active playerIds: ${activePlayerIds.join(', ')}`);
  
  // Get sorted players by score
  const sortedPlayers = getSortedPlayersByScore(newState);
  
  if (sortedPlayers.length < qualifiedCount) {
    console.warn(`[startQualificationReview] Not enough players for qualification (${qualifiedCount}), proceeding to next phase`);
    // If less than qualifiedCount players, proceed directly
    return qualifiedCount === 2 ? startFinalShowdown(newState) : startSemifinal(newState);
  }
  
  // CRITICAL: Sort qualified players by their ORIGINAL playerId for consistent ordering
  const qualified = sortedPlayers.slice(0, qualifiedCount);
  const qualifiedSortedById = [...qualified].sort((a, b) => a.playerId.localeCompare(b.playerId));
  
  console.log('[startQualificationReview] Qualified players:', qualified.map(p => `${p.playerId} (${p.score} pts)`));
  
  // Calculate detailed score breakdowns for qualified players
  const qualificationScores = {};
  const qualifiedPlayers = [];
  
  for (let rank = 0; rank < qualifiedSortedById.length; rank++) {
    const player = qualifiedSortedById[rank];
    const playerId = player.playerId;
    
    qualifiedPlayers.push(playerId);
    qualificationScores[playerId] = calculateDetailedScore(player.captures);
    qualificationScores[playerId].rank = rank + 1; // 1st or 2nd place
    
    console.log(`[startQualificationReview] Player ${playerId} (Rank ${rank + 1}):`, qualificationScores[playerId]);
  }
  
  // CRITICAL FIX: Set playerStatuses - qualified = ACTIVE, not qualified = ELIMINATED
  const qualifiedSet = new Set(qualifiedPlayers);
  
  // Build new playerStatuses using playerId strings
  // Set qualified players to ACTIVE
  for (const playerId of qualifiedPlayers) {
    newState.playerStatuses[playerId] = 'ACTIVE';
  }
  
  // Set non-qualified active players to ELIMINATED
  for (const playerId of activePlayerIds) {
    if (!qualifiedSet.has(playerId)) {
      newState.playerStatuses[playerId] = 'ELIMINATED';
      console.log(`[startQualificationReview] Eliminating non-qualified player ${playerId}`);
    }
  }
  
  // Preserve previously eliminated players
  for (const playerId of eliminatedPlayerIds) {
    newState.playerStatuses[playerId] = 'ELIMINATED';
  }
  
  console.log(`[startQualificationReview] Final playerStatuses:`, JSON.stringify(newState.playerStatuses));
  console.log(`[startQualificationReview] Qualified players:`, qualifiedPlayers);
  
  // Set qualification review state
  newState.tournamentPhase = 'QUALIFICATION_REVIEW';
  newState.qualifiedPlayers = qualifiedPlayers;  // Now contains playerId strings!
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
 * IMPORTANT: Keeps original playerId strings in players array!
 * 
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for semifinal
 */
function startSemifinal(state) {
  const newState = cloneState(state);
  
  console.log('[startSemifinal] Starting semifinal phase');
  console.log('[startSemifinal] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
  // Get qualified players (should already be set from qualification review - playerId strings!)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 2).map(p => p.playerId);
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
  semifinalState.currentPlayer = 0;  // Winner starts
  console.log('[startSemifinal] currentPlayer set to: 0');
  semifinalState.turnCounter = 1;
  semifinalState.moveCount = 0;
  semifinalState.gameOver = false;
  semifinalState.gameMode = isPartyMode ? 'party' : 'three-hands';
  semifinalState.qualificationCountdown = 0;
  semifinalState.finalShowdownHandsPlayed = 0;
  semifinalState.tournamentWinner = newState.tournamentWinner;
  semifinalState.qualifiedPlayers = qualifiedPlayers;  // Keep playerId strings!
  semifinalState.qualificationScores = newState.qualificationScores;
  semifinalState.eliminationOrder = [...newState.eliminationOrder];
  
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
  
  // Filter players to only keep qualified ones
  // IMPORTANT: KEEP original playerId strings in the id field!
  semifinalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const playerId = qualifiedPlayers[j];  // Original playerId string (e.g., 'player_2')
    
    // Find the player in the old array by their playerId
    const oldPlayer = newState.players.find(p => p.id === playerId);
    if (!oldPlayer) {
      console.error(`[startSemifinal] ERROR: Could not find player with id ${playerId}`);
      continue;
    }
    
    const startingCards = playerCount === 3 ? 13 : 10;
    semifinalState.players.push({
      ...oldPlayer,
      id: playerId,  // KEEP original playerId string!
      index: j,  // Update index to new position
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
    console.log(`[startSemifinal] Created player at new index ${j} from playerId ${playerId}`);
  }
  
  semifinalState.scores = new Array(playerCount).fill(0);
  
  // Create round players for turn tracking
  const { createRoundPlayers } = require('../turn');
  semifinalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses and scores using playerId strings
  for (let i = 0; i < playerCount; i++) {
    const playerId = qualifiedPlayers[i];
    semifinalState.playerStatuses[playerId] = 'ACTIVE';
    semifinalState.tournamentScores[playerId] = newState.tournamentScores[playerId] || 0;
    console.log(`[startSemifinal] Setting playerStatuses[${playerId}] = 'ACTIVE', tournamentScores[${playerId}] = ${semifinalState.tournamentScores[playerId]}`);
  }
  
  // Preserve ELIMINATED status for players who didn't qualify for semifinal
  for (let i = 0; i < newState.playerCount; i++) {
    const oldPlayerId = newState.players[i].id;
    if (!qualifiedPlayers.includes(oldPlayerId) && newState.playerStatuses[oldPlayerId] === 'ELIMINATED') {
      semifinalState.playerStatuses[oldPlayerId] = 'ELIMINATED';
      console.log(`[startSemifinal] Preserving ELIMINATED status for playerId ${oldPlayerId}`);
    }
  }
  
  console.log('[startSemifinal] Players array (playerId strings):', semifinalState.players.map(p => p.id));
  console.log('[startSemifinal] Final playerStatuses:', JSON.stringify(semifinalState.playerStatuses));
  console.log('[startSemifinal] Player count:', playerCount);
  console.log('[startSemifinal] AFTER - players.length:', semifinalState.players?.length, ', playerCount:', semifinalState.playerCount);
  
  return semifinalState;
}

/**
 * Transition from qualification review to final showdown
 * Called when countdown reaches zero after semifinal (2 players qualify)
 * 
 * IMPORTANT: Keeps original playerId strings in players array!
 * 
 * @param {Object} state - Current game state
 * @returns {Object} Updated state ready for final showdown
 */
function startFinalShowdown(state) {
  const newState = cloneState(state);
  
  console.log('[startFinalShowdown] Starting final showdown phase');
  console.log('[startFinalShowdown] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
  // Get qualified players (should already be set from qualification review - playerId strings!)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length === 0) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 2).map(p => p.playerId);
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
  finalState.currentPlayer = 0;  // Winner starts
  console.log('[startFinalShowdown] currentPlayer set to: 0');
  finalState.turnCounter = 1;
  finalState.moveCount = 0;
  finalState.gameOver = false;
  finalState.gameMode = isPartyMode ? 'party' : 'two-hands';
  finalState.qualificationCountdown = 0;
  finalState.finalShowdownHandsPlayed = 0;
  finalState.tournamentWinner = newState.tournamentWinner;
  finalState.qualifiedPlayers = qualifiedPlayers;  // Keep playerId strings!
  finalState.qualificationScores = newState.qualificationScores;
  finalState.eliminationOrder = [...newState.eliminationOrder];
  
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
  
  // Keep players with original playerId strings
  finalState.players = [];
  for (let j = 0; j < qualifiedPlayers.length; j++) {
    const playerId = qualifiedPlayers[j];  // Original playerId string
    
    // Find the player in the old array by their playerId
    const oldPlayer = newState.players.find(p => p.id === playerId);
    if (!oldPlayer) {
      console.error(`[startFinalShowdown] ERROR: Could not find player with id ${playerId}`);
      continue;
    }
    
    const startingCards = 10;
    finalState.players.push({
      ...oldPlayer,
      id: playerId,  // KEEP original playerId string!
      index: j,  // Update index to new position
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0
    });
    console.log(`[startFinalShowdown] Created player at new index ${j} from playerId ${playerId}`);
  }
  
  finalState.scores = new Array(playerCount).fill(0);
  
  const { createRoundPlayers } = require('../turn');
  finalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses and scores using playerId strings
  for (let i = 0; i < playerCount; i++) {
    const playerId = qualifiedPlayers[i];
    finalState.playerStatuses[playerId] = 'ACTIVE';
    finalState.tournamentScores[playerId] = newState.tournamentScores[playerId] || 0;
    console.log(`[startFinalShowdown] Setting playerStatuses[${playerId}] = 'ACTIVE', tournamentScores[${playerId}] = ${finalState.tournamentScores[playerId]}`);
  }
  
  console.log('[startFinalShowdown] Players array (playerId strings):', finalState.players.map(p => p.id));
  console.log('[startFinalShowdown] Final playerStatuses:', JSON.stringify(finalState.playerStatuses));
  console.log('[startFinalShowdown] Player count:', playerCount);
  console.log('[startFinalShowdown] AFTER - players.length:', finalState.players?.length, ', playerCount:', finalState.playerCount);
  
  return finalState;
}

module.exports = startQualificationReview;
module.exports.startSemifinal = startSemifinal;
module.exports.startFinalShowdown = startFinalShowdown;
module.exports.getSortedPlayersByScore = getSortedPlayersByScore;
module.exports.calculateDetailedScore = calculateDetailedScore;
