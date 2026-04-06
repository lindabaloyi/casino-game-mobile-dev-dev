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

  // FIX: Keep score-sorted order, don't sort by ID
  // qualified[] is already sorted by score (highest first)
  const qualified = sortedPlayers.slice(0, qualifiedCount);
  
  console.log('[startQualificationReview] Qualified players:', qualified.map(p => `${p.playerId} (${p.score} pts)`));

  // Calculate detailed score breakdowns for qualified players
  // Store in score-sorted order so qualifiedPlayers[0] = highest scorer
  const qualificationScores = {};
  const qualifiedPlayers = [];
  
  for (let rank = 0; rank < qualified.length; rank++) {
    const player = qualified[rank];
    const playerId = player.playerId;
    
    qualifiedPlayers.push(playerId);
    qualificationScores[playerId] = calculateDetailedScore(player.captures);
    qualificationScores[playerId].rank = rank + 1; // 1 = highest score
    
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

  // BUG FIX 1: Remove eliminated players from players array and reduce playerCount
  // This ensures subsequent code sees the correct player count
  const remainingPlayers = [];
  for (const player of newState.players) {
    if (newState.playerStatuses[player.id] === 'ACTIVE') {
      remainingPlayers.push(player);
    }
  }
  newState.players = remainingPlayers;
  newState.playerCount = remainingPlayers.length;
  console.log(`[startQualificationReview] Removed eliminated players - playerCount now ${newState.playerCount}`);

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
 * SIMPLIFIED APPROACH:
 * - Takes 3 qualified players from qualification phase
 * - Reorders them: winner (highest score) at index 0, others by original index
 * - Creates clean 0-1-2 array (no holes, no skipping)
 * - Turn management uses standard 3-hand logic (0->1->2->0)
 * 
 * @param {Object} state - Current game state (should be in QUALIFICATION_REVIEW phase)
 * @returns {Object} Updated state ready for semifinal
 */
function startSemifinal(state) {
  const newState = cloneState(state);
  
  console.log('[startSemifinal] Starting semifinal phase');
  console.log('[startSemifinal] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
  // Get qualified players from qualification review phase (playerId strings!)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length < 2) {
    // Fallback: get top 3 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 3).map(p => p.playerId);
    console.warn('[startSemifinal] Using fallback qualified players (top 3):', qualifiedPlayers);
  }
  
  console.log('[startSemifinal] Raw qualified players:', qualifiedPlayers);

  // BUG FIX 3: Don't sort by ID - keep score-sorted order so qualifiedPlayers[0] = highest scorer
  // The winner-first reordering happens below, so we just need to ensure qualifiedPlayers is score-ordered

  // STEP 1: Reorder qualified players - winner first, then others by original index
  // Find winner (highest score)
  let winnerPlayerId = qualifiedPlayers[0];
  let highestScore = newState.tournamentScores?.[winnerPlayerId] || 0;
  
  for (let i = 1; i < qualifiedPlayers.length; i++) {
    const pid = qualifiedPlayers[i];
    const score = newState.tournamentScores?.[pid] || 0;
    if (score > highestScore) {
      highestScore = score;
      winnerPlayerId = pid;
    }
  }
  
  console.log(`[startSemifinal] Winner: ${winnerPlayerId} with ${highestScore} points`);
  
  // Build new order: winner first, then others sorted by original index
  const otherPlayers = qualifiedPlayers
    .filter(pid => pid !== winnerPlayerId)
    .sort((a, b) => {
      const idxA = parseInt(a.split('_')[1], 10);
      const idxB = parseInt(b.split('_')[1], 10);
      return idxA - idxB;
    });
  
  const newOrder = [winnerPlayerId, ...otherPlayers];
  console.log('[startSemifinal] New player order (winner first):', newOrder);
  
  const playerCount = newOrder.length; // Should be 3
  const isPartyMode = newState.gameMode === 'party';
  
  // Clone the state and set up for semifinal
  const semifinalState = cloneState(newState);
  semifinalState.playerCount = playerCount; // 3 for semifinal
  semifinalState.tournamentMode = newState.tournamentMode;
  semifinalState.tournamentPhase = 'SEMI_FINAL';
  semifinalState.tournamentRound = newState.tournamentRound + 1;
  semifinalState.round = 1;
  
  // Winner starts first (index 0)
  semifinalState.currentPlayer = 0;
  console.log(`[startSemifinal] currentPlayer set to: 0 (winner ${winnerPlayerId})`);
  
  semifinalState.turnCounter = 1;
  semifinalState.moveCount = 0;
  semifinalState.gameOver = false;
  semifinalState.gameMode = isPartyMode ? 'party' : 'three-hands';
  semifinalState.qualificationCountdown = 0;
  semifinalState.finalShowdownHandsPlayed = 0;
  semifinalState.tournamentWinner = newState.tournamentWinner;
  semifinalState.qualifiedPlayers = newOrder; // Updated to new order (winner first)
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
  
  // For three-hands mode (3 players): place one random card on table as initial trail
  const trailCard = deck.splice(0, 1)[0];
  semifinalState.tableCards = [trailCard];
  semifinalState.deck = deck;
  
  // STEP 2: Rebuild players array with new order (winner at index 0)
  semifinalState.players = [];
  
  for (let newIdx = 0; newIdx < newOrder.length; newIdx++) {
    const playerId = newOrder[newIdx];
    
    // Find the player in the old array by their playerId
    const oldPlayer = newState.players.find(p => p.id === playerId);
    if (!oldPlayer) {
      console.error(`[startSemifinal] ERROR: Could not find player with id ${playerId}`);
      continue;
    }
    
    // 13 cards for 3-player game
    const startingCards = deck.splice(0, 13);
    
    semifinalState.players.push({
      ...oldPlayer,
      id: playerId, // KEEP original playerId string!
      index: newIdx, // New index (0 = winner, 1, 2 = others)
      hand: startingCards,
      captures: [],
      score: 0
    });
    console.log(`[startSemifinal] Created player at new index ${newIdx} from playerId ${playerId}`);
  }
  
  semifinalState.scores = new Array(playerCount).fill(0);
  
  // Create round players for turn tracking (3 players)
  const { createRoundPlayers } = require('../turn');
  semifinalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses and scores using playerId strings
  for (let i = 0; i < playerCount; i++) {
    const playerId = newOrder[i];
    semifinalState.playerStatuses[playerId] = 'ACTIVE';
    semifinalState.tournamentScores[playerId] = newState.tournamentScores[playerId] || 0;
    console.log(`[startSemifinal] Setting playerStatuses[${playerId}] = 'ACTIVE', tournamentScores[${playerId}] = ${semifinalState.tournamentScores[playerId]}`);
  }
  
  // Preserve ELIMINATED status for players who didn't qualify
  for (let i = 0; i < newState.playerCount; i++) {
    const oldPlayerId = newState.players[i].id;
    if (!newOrder.includes(oldPlayerId) && newState.playerStatuses[oldPlayerId] === 'ELIMINATED') {
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
 * SIMPLIFIED APPROACH:
 * - Takes 2 qualified players from semifinal phase
 * - Reorders them: winner (highest score) at index 0, other at index 1
 * - Creates clean 0-1 array (no holes, no skipping)
 * - Turn management uses standard 2-hand logic (0->1->0)
 * 
 * @param {Object} state - Current game state (should be in SEMI_FINAL or qualification review)
 * @returns {Object} Updated state ready for final showdown
 */
function startFinalShowdown(state) {
  const newState = cloneState(state);
  
  console.log('[startFinalShowdown] Starting final showdown phase');
  console.log('[startFinalShowdown] BEFORE - players.length:', newState.players?.length, ', playerCount:', newState.playerCount);
  
  // Get qualified players (should already be set - playerId strings!)
  let qualifiedPlayers = newState.qualifiedPlayers || [];
  
  if (qualifiedPlayers.length < 2) {
    // Fallback: get top 2 from scores
    const sortedPlayers = getSortedPlayersByScore(newState);
    qualifiedPlayers = sortedPlayers.slice(0, 2).map(p => p.playerId);
    console.warn('[startFinalShowdown] Using fallback qualified players (top 2):', qualifiedPlayers);
  }
  
  console.log('[startFinalShowdown] Raw qualified players:', qualifiedPlayers);
  
  // STEP 1: Reorder qualified players - winner first
  // Find winner (highest score)
  let winnerPlayerId = qualifiedPlayers[0];
  let highestScore = newState.tournamentScores?.[winnerPlayerId] || 0;
  
  for (let i = 1; i < qualifiedPlayers.length; i++) {
    const pid = qualifiedPlayers[i];
    const score = newState.tournamentScores?.[pid] || 0;
    if (score > highestScore) {
      highestScore = score;
      winnerPlayerId = pid;
    }
  }
  
  console.log(`[startFinalShowdown] Winner: ${winnerPlayerId} with ${highestScore} points`);
  
  // Build new order: winner first
  const otherPlayer = qualifiedPlayers.find(pid => pid !== winnerPlayerId);
  const newOrder = winnerPlayerId && otherPlayer ? [winnerPlayerId, otherPlayer] : qualifiedPlayers;
  
  console.log('[startFinalShowdown] New player order (winner first):', newOrder);
  
  const playerCount = 2; // Final showdown is always 2 players
  const isPartyMode = newState.gameMode === 'party';
  
  // Clone the state
  const finalState = cloneState(newState);
  finalState.playerCount = playerCount;
  finalState.tournamentMode = newState.tournamentMode;
  finalState.tournamentPhase = 'FINAL_SHOWDOWN';
  finalState.tournamentRound = newState.tournamentRound + 1;
  finalState.round = 1;
  
  // Winner starts first (index 0)
  finalState.currentPlayer = 0;
  console.log(`[startFinalShowdown] currentPlayer set to: 0 (winner ${winnerPlayerId})`);
  
  finalState.turnCounter = 1;
  finalState.moveCount = 0;
  finalState.gameOver = false;
  finalState.gameMode = isPartyMode ? 'party' : 'two-hands';
  finalState.qualificationCountdown = 0;
  finalState.finalShowdownHandsPlayed = 0;
  finalState.tournamentWinner = newState.tournamentWinner;
  finalState.qualifiedPlayers = newOrder; // Updated to new order (winner first)
  finalState.qualificationScores = newState.qualificationScores;
  finalState.eliminationOrder = [...newState.eliminationOrder];
  
  // Reset game-specific fields
  finalState.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  finalState.lastCapturePlayer = null;
  finalState.teamCapturedBuilds = {};
  finalState.shiyaRecalls = {};
  
  // Create deck and deal cards (20 cards each for 2-player game)
  const { createDeck } = require('../deck');
  const deck = createDeck();
  finalState.tableCards = deck.splice(0, 4);
  finalState.deck = deck;
  
  // STEP 2: Rebuild players array with new order (winner at index 0)
  finalState.players = [];
  
  for (let newIdx = 0; newIdx < newOrder.length; newIdx++) {
    const playerId = newOrder[newIdx];
    
    // Find the player in the old array by their playerId
    const oldPlayer = newState.players.find(p => p.id === playerId);
    if (!oldPlayer) {
      console.error(`[startFinalShowdown] ERROR: Could not find player with id ${playerId}`);
      continue;
    }
    
    // 10 cards per player for 2-player game
    const startingCards = deck.splice(0, 10);
    
    finalState.players.push({
      ...oldPlayer,
      id: playerId, // KEEP original playerId string!
      index: newIdx, // New index (0 = winner, 1 = other)
      hand: startingCards,
      captures: [],
      score: 0
    });
    console.log(`[startFinalShowdown] Created player at new index ${newIdx} from playerId ${playerId}`);
  }
  
  finalState.scores = new Array(playerCount).fill(0);
  
  // Create round players for turn tracking (2 players)
  const { createRoundPlayers } = require('../turn');
  finalState.roundPlayers = createRoundPlayers(playerCount);
  
  // Set player statuses and scores using playerId strings
  for (let i = 0; i < playerCount; i++) {
    const playerId = newOrder[i];
    finalState.playerStatuses[playerId] = 'ACTIVE';
    finalState.tournamentScores[playerId] = newState.tournamentScores[playerId] || 0;
    console.log(`[startFinalShowdown] Setting playerStatuses[${playerId}] = 'ACTIVE', tournamentScores[${playerId}] = ${finalState.tournamentScores[playerId]}`);
  }
  
  // Preserve ELIMINATED status for players who didn't qualify
  for (let i = 0; i < newState.playerCount; i++) {
    const oldPlayerId = newState.players[i].id;
    if (!newOrder.includes(oldPlayerId) && newState.playerStatuses[oldPlayerId] === 'ELIMINATED') {
      finalState.playerStatuses[oldPlayerId] = 'ELIMINATED';
      console.log(`[startFinalShowdown] Preserving ELIMINATED status for playerId ${oldPlayerId}`);
    }
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
