/**
 * startTournament
 * Initializes a knockout tournament with 4 players.
 * Sets all players to ACTIVE status and initializes tournament state.
 */

const { cloneState } = require('../');

function startTournament(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  console.log(`[startTournament] Player ${playerIndex} starting knockout tournament`);
  
  // Validate: must have exactly 4 players
  if (newState.playerCount !== 4) {
    throw new Error('Knockout tournament requires exactly 4 players');
  }
  
  // Initialize tournament state
  newState.tournamentMode = 'knockout';
  newState.tournamentPhase = 'QUALIFYING';
  newState.tournamentRound = 1;
  newState.eliminationOrder = [];
  newState.finalShowdownHandsPlayed = 0;
  newState.tournamentWinner = null;
  
  // Initialize player statuses and tournament scores
  for (let i = 0; i < newState.playerCount; i++) {
    newState.playerStatuses[i] = 'ACTIVE';
    newState.tournamentScores[i] = 0;
  }
  
  console.log(`[startTournament] ✅ Tournament initialized:`);
  console.log(`  Phase: ${newState.tournamentPhase}`);
  console.log(`  Round: ${newState.tournamentRound}`);
  console.log(`  Players:`, newState.playerStatuses);
  
  return newState;
}

module.exports = startTournament;
