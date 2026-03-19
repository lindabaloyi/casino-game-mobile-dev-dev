/**
 * endFinalShowdown
 * Ends a hand in the final showdown, tracks hands played,
 * and declares winner after 2 hands.
 */

const { cloneState, initializeGame } = require('../');

/**
 * Calculate total score from captures for a player
 */
function calculateScore(captures) {
  if (!captures || captures.length === 0) return 0;
  return captures.reduce((sum, card) => sum + (card.value || 0), 0);
}

function endFinalShowdown(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  console.log(`[endFinalShowdown] Processing final showdown hand end`);
  
  // Validate tournament is in final showdown
  if (!newState.tournamentMode || newState.tournamentMode !== 'knockout') {
    throw new Error('No active knockout tournament');
  }
  
  if (newState.tournamentPhase !== 'FINAL_SHOWDOWN') {
    throw new Error('Tournament is not in FINAL_SHOWDOWN phase');
  }
  
  // Calculate scores for this hand
  console.log(`[endFinalShowdown] Calculating hand scores...`);
  for (let i = 0; i < newState.playerCount; i++) {
    if (newState.playerStatuses[i] === 'ACTIVE') {
      const handScore = calculateScore(newState.players[i].captures);
      newState.tournamentScores[i] = (newState.tournamentScores[i] || 0) + handScore;
      console.log(`[endFinalShowdown] Player ${i}: hand score ${handScore}, total ${newState.tournamentScores[i]}`);
    }
  }
  
  // Increment hands played
  newState.finalShowdownHandsPlayed = (newState.finalShowdownHandsPlayed || 0) + 1;
  console.log(`[endFinalShowdown] Hands played: ${newState.finalShowdownHandsPlayed}/2`);
  
  // Check if we've played 2 hands
  if (newState.finalShowdownHandsPlayed >= 2) {
    // Determine winner
    const activePlayers = [];
    for (let i = 0; i < newState.playerCount; i++) {
      if (newState.playerStatuses[i] === 'ACTIVE') {
        activePlayers.push({ 
          index: i, 
          score: newState.tournamentScores[i] 
        });
      }
    }
    
    if (activePlayers.length !== 2) {
      throw new Error('Final showdown requires exactly 2 players');
    }
    
    // Compare scores - HIGHER score wins
    activePlayers.sort((a, b) => b.score - a.score); // Descending
    
    const winner = activePlayers[0].index;
    const loser = activePlayers[1].index;
    
    console.log(`[endFinalShowdown] FINAL RESULTS:`);
    console.log(`  Player ${winner}: ${activePlayers[0].score} points - WINNER!`);
    console.log(`  Player ${loser}: ${activePlayers[1].score} points`);
    
    // Update statuses
    newState.playerStatuses[winner] = 'WINNER';
    newState.playerStatuses[loser] = 'ELIMINATED';
    newState.tournamentWinner = winner;
    newState.tournamentPhase = 'COMPLETED';
    
    console.log(`[endFinalShowdown] TOURNAMENT COMPLETE! Winner: Player ${winner}`);
    
    return newState;
  }
  
  // Start next hand (reset table but keep scores)
  console.log(`[endFinalShowdown] Starting hand ${newState.finalShowdownHandsPlayed + 1}`);
  
  // Reset for next hand while keeping tournament state
  const resetState = initializeGame(newState.playerCount, newState.gameMode === 'party');
  
  // Preserve tournament state
  resetState.tournamentMode = newState.tournamentMode;
  resetState.tournamentPhase = newState.tournamentPhase;
  resetState.tournamentRound = newState.tournamentRound;
  resetState.playerStatuses = newState.playerStatuses;
  resetState.tournamentScores = newState.tournamentScores;
  resetState.eliminationOrder = newState.eliminationOrder;
  resetState.finalShowdownHandsPlayed = newState.finalShowdownHandsPlayed;
  resetState.tournamentWinner = newState.tournamentWinner;
  
  console.log(`[endFinalShowdown] Hand ${resetState.finalShowdownHandsPlayed + 1} starting`);
  
  return resetState;
}

module.exports = endFinalShowdown;
