/**
 * endTournamentRound
 * Ends a tournament round, calculates scores, eliminates lowest scorer,
 * and advances to next phase or final showdown.
 */

const { cloneState, initializeGame, calculatePlayerScore } = require('../');
const startQualificationReview = require('./startQualificationReview');

// Use the shared scoring function for standard Casino scoring (11 points total)
const calculateScore = calculatePlayerScore;

/**
 * Find the player with the lowest score
 * Uses tiebreakers: fewer cards in captures, then lower seating position
 * IMPORTANT: Uses playerId strings, NOT indices!
 */
function findLowestScorer(state) {
  const activePlayers = [];
  
  console.log(`[findLowestScorer] playerCount: ${state.playerCount}`);
  console.log(`[findLowestScorer] playerStatuses (playerId strings): ${JSON.stringify(state.playerStatuses)}`);
  console.log(`[findLowestScorer] tournamentScores: ${JSON.stringify(state.tournamentScores)}`);
  
  // Get all active players with their scores using playerId strings
  for (let i = 0; i < state.playerCount; i++) {
    const playerId = state.players[i].id;  // Get playerId string (e.g., 'player_0')
    
    // Check status using the playerId string
    if (state.playerStatuses[playerId] === 'ACTIVE') {
      const score = state.tournamentScores[playerId] || 0;
      const cardCount = state.players[i].captures?.length || 0;
      activePlayers.push({ 
        playerId: playerId,  // Return playerId string for consistency
        score, 
        cardCount 
      });
      console.log(`[findLowestScorer] Player ${playerId}: score=${score}, cardCount=${cardCount}`);
    }
  }
  
  if (activePlayers.length === 0) {
    throw new Error('No active players found');
  }
  
  // Sort by score (ascending), then card count (ascending), then playerId
  activePlayers.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.cardCount !== b.cardCount) return a.cardCount - b.cardCount;
    return a.playerId.localeCompare(b.playerId);
  });
  
  console.log(`[findLowestScorer] Lowest scorer: playerId=${activePlayers[0].playerId}, score=${activePlayers[0].score}`);
  return activePlayers[0].playerId;  // Return playerId string, not index!
}

/**
 * Compress players array to only include active players with contiguous indices
 * This ensures players array indices match the new playerCount after elimination
 * IMPORTANT: playerStatuses and tournamentScores continue using playerId strings!
 * 
 * @param {Object} state - Current game state
 * @param {string[]} activePlayerIds - Array of playerId strings to keep
 * @returns {Object} New state with compressed players array
 */
function compressStateForNewPhase(state, activePlayerIds) {
  const newState = cloneState(state);
  const newPlayerCount = activePlayerIds.length;
  
  console.log(`[compressStateForNewPhase] Compressing from ${state.playerCount} to ${newPlayerCount} players`);
  console.log(`[compressStateForNewPhase] Active playerIds: ${activePlayerIds.join(', ')}`);
  
  // Create new players array with contiguous indices (0, 1, 2, ...)
  // IMPORTANT: Keep the ORIGINAL playerId string in the id field!
  const newPlayers = [];
  
  for (let newIdx = 0; newIdx < activePlayerIds.length; newIdx++) {
    const playerId = activePlayerIds[newIdx];  // Original playerId string (e.g., 'player_2')
    
    // Find the player in the old array by their playerId
    const oldPlayer = state.players.find(p => p.id === playerId);
    if (!oldPlayer) {
      console.error(`[compressStateForNewPhase] ERROR: Could not find player with id ${playerId}`);
      continue;
    }
    
    newPlayers.push({
      ...oldPlayer,
      id: playerId,  // KEEP original playerId string!
      index: newIdx,  // Update index to new position
      hand: [],  // Fresh hand for new round
      captures: [],  // Fresh captures for new round
      score: 0
    });
    
    // Update playerStatuses and tournamentScores using playerId string
    newState.playerStatuses[playerId] = 'ACTIVE';
    newState.tournamentScores[playerId] = state.tournamentScores[playerId] || 0;
    
    console.log(`[compressStateForNewPhase] newIdx=${newIdx} <- playerId=${playerId}`);
  }
  
  // Preserve ELIMINATED status for non-active players using their playerId strings
  for (let i = 0; i < state.playerCount; i++) {
    const oldPlayerId = state.players[i].id;
    if (!activePlayerIds.includes(oldPlayerId)) {
      newState.playerStatuses[oldPlayerId] = 'ELIMINATED';
      console.log(`[compressStateForNewPhase] Preserving ELIMINATED for playerId ${oldPlayerId}`);
    }
  }
  
  newState.players = newPlayers;
  newState.playerCount = newPlayerCount;
  newState.scores = new Array(newPlayerCount).fill(0);
  
  // Update currentPlayer to new index if still active
  const currentPlayerId = state.players[state.currentPlayer]?.id;
  if (currentPlayerId && activePlayerIds.includes(currentPlayerId)) {
    newState.currentPlayer = activePlayerIds.indexOf(currentPlayerId);
    console.log(`[compressStateForNewPhase] currentPlayer remapped: ${state.currentPlayer} -> ${newState.currentPlayer}`);
  } else {
    newState.currentPlayer = 0;  // Fallback
    console.log(`[compressStateForNewPhase] currentPlayer fallback to 0`);
  }
  
  // Reset round-specific fields
  newState.tableCards = [];
  newState.turnCounter = 1;
  newState.moveCount = 0;
  newState.gameOver = false;
  
  // Create new deck for the new player count
  const { createDeck } = require('../deck');
  const deck = createDeck();
  
  // Deal cards to players
  const cardsPerPlayer = newPlayerCount === 2 ? 10 : (newPlayerCount === 3 ? 13 : 10);
  for (let i = 0; i < newPlayerCount; i++) {
    newPlayers[i].hand = deck.splice(0, cardsPerPlayer);
  }
  
  // Place initial table cards
  if (newPlayerCount === 3) {
    newState.tableCards = [deck.splice(0, 1)[0]];
  } else if (newPlayerCount === 4) {
    newState.tableCards = deck.splice(0, 4);
  } else {
    newState.tableCards = deck.splice(0, 4);
  }
  newState.deck = deck;
  
  // Create round players for turn tracking
  const { createRoundPlayers } = require('../turn');
  newState.roundPlayers = createRoundPlayers(newPlayerCount);
  
  // Reset game-specific fields
  newState.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  newState.lastCapturePlayer = null;
  newState.teamCapturedBuilds = {};
  newState.shiyaRecalls = {};
  
  console.log(`[compressStateForNewPhase] Compressed: players.length=${newState.players.length}, playerCount=${newState.playerCount}`);
  console.log(`[compressStateForNewPhase] New player IDs:`, newState.players.map(p => p.id));
  
  return newState;
}

/**
 * Start a new round (reset hands and table) - DEPRECATED
 * Use compressStateForNewPhase instead for tournament transitions
 */
function startNewRound(state) {
  // DEPRECATED: This loses player identity
  // Use compressStateForNewPhase instead
  console.warn('[startNewRound] DEPRECATED - using compressStateForNewPhase instead');
  
  // Get active player indices - use playerId strings!
  const activeIndices = [];
  for (let i = 0; i < state.playerCount; i++) {
    const playerId = state.players[i].id;
    if (state.playerStatuses[playerId] === 'ACTIVE') {
      activeIndices.push(i);
    }
  }
  
  return compressStateForNewPhase(state, activeIndices);
}

function endTournamentRound(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  console.log(`[endTournamentRound] Processing round end for tournament`);
  
  // Validate tournament is active
  if (!newState.tournamentMode || newState.tournamentMode !== 'knockout') {
    throw new Error('No active knockout tournament');
  }
  
  // Calculate scores for this round
  // IMPORTANT: playerStatuses and tournamentScores use PLAYER ID STRINGS (e.g., 'player_0'), NOT indices!
  console.log(`[endTournamentRound] Calculating scores...`);
  console.log(`[endTournamentRound] playerStatuses (using playerId strings): ${JSON.stringify(newState.playerStatuses)}`);
  console.log(`[endTournamentRound] tournamentScores: ${JSON.stringify(newState.tournamentScores)}`);
  
  // Sum up scores from each player's captures using their playerId
  for (let i = 0; i < newState.playerCount; i++) {
    const playerId = newState.players[i].id;  // Get playerId string (e.g., 'player_0')
    
    // Check status using the playerId string
    if (newState.playerStatuses[playerId] === 'ACTIVE') {
      const roundScore = calculateScore(newState.players[i].captures);
      newState.tournamentScores[playerId] = (newState.tournamentScores[playerId] || 0) + roundScore;
      console.log(`[endTournamentRound] Player ${playerId}: round score ${roundScore}, total ${newState.tournamentScores[playerId]}`);
    }
  }
  
  // Count active players
  const activePlayers = Object.values(newState.playerStatuses).filter(s => s === 'ACTIVE').length;
  console.log(`[endTournamentRound] Active players: ${activePlayers}`);
  
  // Check if we should start qualification review
  // This shows qualified players with score breakdown before advancing to next round
  // Trigger when:
  // 1. Going from 4→3 in QUALIFYING - just compress state, go to SEMI_FINAL
  // 2. Going from 3→2 in SEMI_FINAL - show top 2 qualified for final
  const remainingAfterElimination = activePlayers - 1;
  
  // For QUALIFYING phase with 4 players: after elimination we go to SEMI_FINAL with 3 players
  // Show qualification review with 3 players qualifying (to display scores and who advances)
  if (newState.tournamentPhase === 'QUALIFYING' && activePlayers === 4) {
    console.log(`[endTournamentRound] QUALIFYING phase with 4 players - starting qualification review for 3 to advance`);
    
    // Start qualification review with 3 players qualifying (not 2!)
    // This will show the score breakdown and eliminate only the lowest scorer
    const reviewState = startQualificationReview(newState, 3);
    
    console.log(`[endTournamentRound] Qualification review started (3 players will qualify for SEMI_FINAL)`);
    return reviewState;
  }
  
  // For SEMI_FINAL phase (3 players): trigger qualification review for top 2
  // Trigger qualification review when going to 2 players (from 3)
  if (remainingAfterElimination >= 2) {
    console.log(`[endTournamentRound] ${remainingAfterElimination} players will remain - starting QUALIFICATION REVIEW`);
    
    // Start qualification review phase (shows qualified players with score breakdown)
    const reviewState = startQualificationReview(newState, remainingAfterElimination);
    
    console.log(`[endTournamentRound] Qualification review started`);
    return reviewState;
  }
  
  // Otherwise, eliminate lowest scorer
  const eliminatedPlayer = findLowestScorer(newState);
  console.log(`[endTournamentRound] Eliminating player ${eliminatedPlayer} (lowest score)`);
  
  // Update player status
  newState.playerStatuses[eliminatedPlayer] = 'ELIMINATED';
  newState.eliminationOrder.push(eliminatedPlayer);
  
  // Get remaining active player IDs (playerId strings)
  const activePlayerIds = [];
  for (let i = 0; i < newState.playerCount; i++) {
    const playerId = newState.players[i].id;
    if (newState.playerStatuses[playerId] === 'ACTIVE') {
      activePlayerIds.push(playerId);
    }
  }
  
  // Determine next phase
  const remainingPlayers = activePlayerIds.length;
  let nextPhase = newState.tournamentPhase;
  
  if (remainingPlayers === 3) {
    nextPhase = 'SEMI_FINAL';
    console.log(`[endTournamentRound] Advancing to SEMI_FINAL (3 players)`);
  } else if (remainingPlayers === 2) {
    nextPhase = 'FINAL_SHOWDOWN';
    console.log(`[endTournamentRound] Advancing to FINAL_SHOWDOWN`);
  }
  
  // CRITICAL: Compress state to rebuild players array with contiguous indices
  const compressedState = compressStateForNewPhase(newState, activePlayerIds);
  
  // Preserve tournament-specific fields
  compressedState.tournamentPhase = nextPhase;
  compressedState.tournamentRound = newState.tournamentRound + 1;
  compressedState.eliminationOrder = newState.eliminationOrder;
  compressedState.tournamentWinner = newState.tournamentWinner;
  compressedState.finalShowdownHandsPlayed = newState.finalShowdownHandsPlayed || 0;
  compressedState.tournamentMode = newState.tournamentMode;
  
  // Preserve qualifiedPlayers (now using playerId strings)
  compressedState.qualifiedPlayers = activePlayerIds;
  compressedState.qualificationScores = newState.qualificationScores;
  
  console.log(`[endTournamentRound] AFTER compression - players.length: ${compressedState.players?.length}, playerCount: ${compressedState.playerCount}`);
  console.log(`[endTournamentRound] Tournament phase: ${compressedState.tournamentPhase}, Round: ${compressedState.tournamentRound}`);
  console.log(`[endTournamentRound] Players array:`, compressedState.players?.map(p => p.id));
  
  console.log(`[endTournamentRound] Round ${compressedState.tournamentRound} starting`);
  
  return compressedState;
}

module.exports = endTournamentRound;
