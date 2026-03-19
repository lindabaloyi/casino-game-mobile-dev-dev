/**
 * endTournamentRound
 * Ends a tournament round, calculates scores, eliminates lowest scorer,
 * and advances to next phase or final showdown.
 */

const { cloneState, initializeGame, calculatePlayerScore } = require('../');

// Use the shared scoring function for standard Casino scoring (11 points total)
const calculateScore = calculatePlayerScore;

/**
 * Find the player with the lowest score
 * Uses tiebreakers: fewer cards in captures, then lower seating position
 */
function findLowestScorer(state) {
  const activePlayers = [];
  
  // Get all active players with their scores
  for (let i = 0; i < state.playerCount; i++) {
    if (state.playerStatuses[i] === 'ACTIVE') {
      const score = state.tournamentScores[i] || 0;
      const cardCount = state.players[i].captures?.length || 0;
      activePlayers.push({ 
        index: i, 
        score, 
        cardCount 
      });
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
  console.log(`[endTournamentRound] Calculating scores...`);
  for (let i = 0; i < newState.playerCount; i++) {
    if (newState.playerStatuses[i] === 'ACTIVE') {
      const roundScore = calculateScore(newState.players[i].captures);
      newState.tournamentScores[i] = (newState.tournamentScores[i] || 0) + roundScore;
      console.log(`[endTournamentRound] Player ${i}: round score ${roundScore}, total ${newState.tournamentScores[i]}`);
    }
  }
  
  // Count active players
  const activePlayers = Object.values(newState.playerStatuses).filter(s => s === 'ACTIVE').length;
  console.log(`[endTournamentRound] Active players: ${activePlayers}`);
  
  // Check if we should start final showdown (2 players remain)
  if (activePlayers === 2) {
    console.log(`[endTournamentRound] 2 players remain - starting FINAL SHOWDOWN!`);
    newState.tournamentPhase = 'FINAL_SHOWDOWN';
    newState.finalShowdownHandsPlayed = 0;
    
    // Start first hand of final
    const resetState = startNewRound(newState);
    resetState.tournamentPhase = 'FINAL_SHOWDOWN';
    resetState.finalShowdownHandsPlayed = 0;
    
    console.log(`[endTournamentRound] Final showdown hand 1 starting`);
    return resetState;
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
