/**
 * endFinalShowdown
 * Ends a hand in the final showdown, tracks hands played,
 * and declares winner after 2 hands.
 */

const { cloneState, initializeGame, calculatePlayerScore } = require('../');

// Use the shared scoring function for standard Casino scoring (11 points total)
const calculateScore = calculatePlayerScore;

function endFinalShowdown(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  console.log(`[endFinalShowdown] Processing final showdown hand end`);
  console.log(`[endFinalShowdown] playerCount: ${newState.playerCount}, qualifiedPlayers: ${JSON.stringify(newState.qualifiedPlayers)}`);
  console.log(`[endFinalShowdown] playerStatuses: ${JSON.stringify(newState.playerStatuses)}`);
  console.log(`[endFinalShowdown] tournamentScores: ${JSON.stringify(newState.tournamentScores)}`);
  
  // Validate tournament is in final showdown
  if (!newState.tournamentMode || newState.tournamentMode !== 'knockout') {
    throw new Error('No active knockout tournament');
  }
  
  if (newState.tournamentPhase !== 'FINAL_SHOWDOWN') {
    throw new Error('Tournament is not in FINAL_SHOWDOWN phase');
  }
  
  // Calculate scores for this hand
  // BUG FIX: Need to use qualifiedPlayers to map between new indices and original indices
  console.log(`[endFinalShowdown] Calculating hand scores...`);
  console.log(`[endFinalShowdown] Using qualifiedPlayers mapping: ${JSON.stringify(newState.qualifiedPlayers)}`);
  
  for (let newIndex = 0; newIndex < newState.playerCount; newIndex++) {
    // Map new index to original index using qualifiedPlayers
    const originalIndex = newState.qualifiedPlayers?.[newIndex] ?? newIndex;
    console.log(`[endFinalShowdown] newIndex=${newIndex} -> originalIndex=${originalIndex}, playerStatuses[${newIndex}]=${newState.playerStatuses[newIndex]}, playerStatuses[${originalIndex}]=${newState.playerStatuses[originalIndex]}`);
    
    // Check status using the ORIGINAL index (how it's stored in playerStatuses)
    if (newState.playerStatuses[originalIndex] === 'ACTIVE') {
      const handScore = calculateScore(newState.players[newIndex].captures);
      newState.tournamentScores[originalIndex] = (newState.tournamentScores[originalIndex] || 0) + handScore;
      console.log(`[endFinalShowdown] Player originalIndex=${originalIndex} (newIndex=${newIndex}): hand score ${handScore}, total ${newState.tournamentScores[originalIndex]}`);
    }
  }
  
  // Increment hands played
  newState.finalShowdownHandsPlayed = (newState.finalShowdownHandsPlayed || 0) + 1;
  console.log(`[endFinalShowdown] Hands played: ${newState.finalShowdownHandsPlayed}/2`);
  
  // Check if we've played 2 hands
  if (newState.finalShowdownHandsPlayed >= 2) {
    // Determine winner using ORIGINAL indices
    const activePlayers = [];
    for (let newIndex = 0; newIndex < newState.playerCount; newIndex++) {
      const originalIndex = newState.qualifiedPlayers?.[newIndex] ?? newIndex;
      if (newState.playerStatuses[originalIndex] === 'ACTIVE') {
        activePlayers.push({ 
          index: originalIndex,  // Use original index for consistency
          score: newState.tournamentScores[originalIndex] 
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
  resetState.qualifiedPlayers = newState.qualifiedPlayers;
  
  console.log(`[endFinalShowdown] Hand ${resetState.finalShowdownHandsPlayed + 1} starting`);
  
  return resetState;
}

module.exports = endFinalShowdown;
