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
 * Start a new round (reset hands and table)
 */
function startNewRound(state) {
  // Reset for a new round while keeping tournament state
  const newState = initializeGame(state.playerCount, state.gameMode === 'party');
  
  // Preserve tournament state
  newState.tournamentMode = state.tournamentMode;
  newState.tournamentPhase = state.tournamentPhase;
  newState.tournamentRound = state.tournamentRound;
  newState.playerStatuses = state.playerStatuses;
  newState.tournamentScores = state.tournamentScores;
  newState.eliminationOrder = state.eliminationOrder;
  newState.finalShowdownHandsPlayed = state.finalShowdownHandsPlayed;
  newState.tournamentWinner = state.tournamentWinner;
  
  return newState;
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
  
  // Determine next phase
  const remainingPlayers = Object.values(newState.playerStatuses).filter(s => s === 'ACTIVE').length;
  
  if (remainingPlayers === 3) {
    newState.tournamentPhase = 'SEMI_FINAL';
    console.log(`[endTournamentRound] Advancing to SEMI_FINAL (3 players)`);
  } else if (remainingPlayers === 2) {
    // Should have been caught above, but just in case
    newState.tournamentPhase = 'FINAL_SHOWDOWN';
    console.log(`[endTournamentRound] Advancing to FINAL_SHOWDOWN`);
  }
  
  // Start next round
  const resetState = startNewRound(newState);
  resetState.tournamentPhase = newState.tournamentPhase;
  resetState.tournamentRound = newState.tournamentRound + 1;
  resetState.playerStatuses = newState.playerStatuses;
  resetState.tournamentScores = newState.tournamentScores;
  resetState.eliminationOrder = newState.eliminationOrder;
  
  console.log(`[endTournamentRound] Round ${resetState.tournamentRound} starting`);
  
  return resetState;
}

module.exports = endTournamentRound;
