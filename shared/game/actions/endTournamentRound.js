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
 * BUG FIX: Must use qualifiedPlayers mapping to get correct original indices
 */
function findLowestScorer(state) {
  const activePlayers = [];
  
  console.log(`[findLowestScorer] playerCount: ${state.playerCount}, qualifiedPlayers: ${JSON.stringify(state.qualifiedPlayers)}`);
  console.log(`[findLowestScorer] playerStatuses: ${JSON.stringify(state.playerStatuses)}`);
  console.log(`[findLowestScorer] tournamentScores: ${JSON.stringify(state.tournamentScores)}`);
  
  // Get all active players with their scores
  // BUG FIX: Use qualifiedPlayers to map between new and original indices
  for (let newIndex = 0; newIndex < state.playerCount; newIndex++) {
    // Map new index to original index using qualifiedPlayers (if available)
    const originalIndex = state.qualifiedPlayers?.[newIndex] ?? newIndex;
    
    // Check status using the ORIGINAL index
    if (state.playerStatuses[originalIndex] === 'ACTIVE') {
      const score = state.tournamentScores[originalIndex] || 0;
      const cardCount = state.players[newIndex].captures?.length || 0;  // Use newIndex for players array
      activePlayers.push({ 
        index: originalIndex,  // Return ORIGINAL index for consistency
        score, 
        cardCount 
      });
      console.log(`[findLowestScorer] newIndex=${newIndex} -> originalIndex=${originalIndex}: score=${score}, cardCount=${cardCount}`);
    }
  }
  
  if (activePlayers.length === 0) {
    throw new Error('No active players found');
  }
  
  // Sort by score (ascending), then card count (ascending), then index
  activePlayers.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.cardCount !== b.cardCount) return a.cardCount - b.cardCount;
    return a.index - b.index;
  });
  
  console.log(`[findLowestScorer] Lowest scorer: originalIndex=${activePlayers[0].index}, score=${activePlayers[0].score}`);
  return activePlayers[0].index;
}

/**
 * Compress players array to only include active players with contiguous indices
 * This ensures players array indices match the new playerCount after elimination
 * 
 * @param {Object} state - Current game state
 * @param {number[]} activeIndices - Array of original indices to keep
 * @returns {Object} New state with compressed players array
 */
function compressStateForNewPhase(state, activeIndices) {
  const newState = cloneState(state);
  const newPlayerCount = activeIndices.length;
  
  console.log(`[compressStateForNewPhase] Compressing from ${state.playerCount} to ${newPlayerCount} players`);
  console.log(`[compressStateForNewPhase] Active indices (original): ${activeIndices.join(', ')}`);
  
  // Create new players array with contiguous indices (0, 1, 2, ...)
  const newPlayers = [];
  const newPlayerStatuses = {};
  const newTournamentScores = {};
  
  for (let newIdx = 0; newIdx < activeIndices.length; newIdx++) {
    const originalIdx = activeIndices[newIdx];
    newPlayers.push({
      ...state.players[originalIdx],
      id: newIdx,
      hand: [],  // Fresh hand for new round
      captures: [],  // Fresh captures for new round
      score: 0
    });
    newPlayerStatuses[newIdx] = 'ACTIVE';
    newTournamentScores[newIdx] = state.tournamentScores[originalIdx] || 0;
    console.log(`[compressStateForNewPhase] newIdx=${newIdx} <- originalIdx=${originalIdx}`);
  }
  
  // Preserve ELIMINATED status for non-active players
  for (let i = 0; i < state.playerCount; i++) {
    if (!activeIndices.includes(i)) {
      newPlayerStatuses[i] = 'ELIMINATED';
      console.log(`[compressStateForNewPhase] Preserving ELIMINATED for original index ${i}`);
    }
  }
  
  newState.players = newPlayers;
  newState.playerCount = newPlayerCount;
  newState.playerStatuses = newPlayerStatuses;
  newState.tournamentScores = newTournamentScores;
  newState.scores = new Array(newPlayerCount).fill(0);
  
  // Update currentPlayer to new index if still active
  if (activeIndices.includes(state.currentPlayer)) {
    newState.currentPlayer = activeIndices.indexOf(state.currentPlayer);
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
  
  // Get active player indices
  const activeIndices = [];
  for (let i = 0; i < state.playerCount; i++) {
    if (state.playerStatuses[i] === 'ACTIVE') {
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
  // BUG FIX: Need to use qualifiedPlayers to map between new indices and original indices
  console.log(`[endTournamentRound] Calculating scores...`);
  console.log(`[endTournamentRound] playerCount: ${newState.playerCount}, qualifiedPlayers: ${JSON.stringify(newState.qualifiedPlayers)}`);
  console.log(`[endTournamentRound] playerStatuses: ${JSON.stringify(newState.playerStatuses)}`);
  
  for (let newIndex = 0; newIndex < newState.playerCount; newIndex++) {
    // Map new index to original index using qualifiedPlayers (if available)
    const originalIndex = newState.qualifiedPlayers?.[newIndex] ?? newIndex;
    console.log(`[endTournamentRound] newIndex=${newIndex} -> originalIndex=${originalIndex}, playerStatuses[${newIndex}]=${newState.playerStatuses[newIndex]}, playerStatuses[${originalIndex}]=${newState.playerStatuses[originalIndex]}`);
    
    // Check status using the ORIGINAL index (how it's stored in playerStatuses)
    if (newState.playerStatuses[originalIndex] === 'ACTIVE') {
      const roundScore = calculateScore(newState.players[newIndex].captures);
      newState.tournamentScores[originalIndex] = (newState.tournamentScores[originalIndex] || 0) + roundScore;
      console.log(`[endTournamentRound] Player originalIndex=${originalIndex} (newIndex=${newIndex}): round score ${roundScore}, total ${newState.tournamentScores[originalIndex]}`);
    }
  }
  
  // Count active players
  const activePlayers = Object.values(newState.playerStatuses).filter(s => s === 'ACTIVE').length;
  console.log(`[endTournamentRound] Active players: ${activePlayers}`);
  
  // Check if we should start qualification review
  // This shows qualified players with score breakdown before advancing to next round
  // Trigger when:
  // 1. Going from 4→3 in QUALIFYING (show top 3 qualified)
  // 2. Going from 3→2 in SEMI_FINAL (show top 2 qualified for final)
  const remainingAfterElimination = activePlayers - 1;
  
  // Trigger qualification review when going to 3 players (from 4) or 2 players (from 3)
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
  
  // Get remaining active player indices
  const activeIndices = [];
  for (let i = 0; i < newState.playerCount; i++) {
    if (newState.playerStatuses[i] === 'ACTIVE') {
      activeIndices.push(i);
    }
  }
  
  // Determine next phase
  const remainingPlayers = activeIndices.length;
  let nextPhase = newState.tournamentPhase;
  
  if (remainingPlayers === 3) {
    nextPhase = 'SEMI_FINAL';
    console.log(`[endTournamentRound] Advancing to SEMI_FINAL (3 players)`);
  } else if (remainingPlayers === 2) {
    nextPhase = 'FINAL_SHOWDOWN';
    console.log(`[endTournamentRound] Advancing to FINAL_SHOWDOWN`);
  }
  
  // CRITICAL: Compress state to rebuild players array with contiguous indices
  const compressedState = compressStateForNewPhase(newState, activeIndices);
  
  // Preserve tournament-specific fields
  compressedState.tournamentPhase = nextPhase;
  compressedState.tournamentRound = newState.tournamentRound + 1;
  compressedState.eliminationOrder = newState.eliminationOrder;
  compressedState.tournamentWinner = newState.tournamentWinner;
  compressedState.finalShowdownHandsPlayed = newState.finalShowdownHandsPlayed || 0;
  compressedState.tournamentMode = newState.tournamentMode;
  
  // Preserve qualifiedPlayers for mapping
  compressedState.qualifiedPlayers = activeIndices;
  compressedState.qualificationScores = newState.qualificationScores;
  
  console.log(`[endTournamentRound] AFTER compression - players.length: ${compressedState.players?.length}, playerCount: ${compressedState.playerCount}`);
  console.log(`[endTournamentRound] Tournament phase: ${compressedState.tournamentPhase}, Round: ${compressedState.tournamentRound}`);
  console.log(`[endTournamentRound] Players array:`, compressedState.players?.map(p => p.id));
  
  console.log(`[endTournamentRound] Round ${compressedState.tournamentRound} starting`);
  
  return compressedState;
}

module.exports = endTournamentRound;
