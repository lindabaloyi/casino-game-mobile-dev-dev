/**
 * endFinalShowdown
 * Ends a hand in the final showdown, tracks hands played,
 * and declares winner after 2 hands.
 * 
 * IMPORTANT: Now uses playerId strings (e.g., 'player_0') instead of numeric indices!
 */

const { cloneState, initializeGame, calculatePlayerScore } = require('../');

// Use the shared scoring function for standard Casino scoring (11 points total)
const calculateScore = calculatePlayerScore;

function endFinalShowdown(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  console.log(`[endFinalShowdown] === TOURNAMENT FINAL SHOWDOWN DEBUG ===`);
  console.log(`[endFinalShowdown] Processing final showdown hand end`);
  console.log(`[endFinalShowdown] playerCount: ${newState.playerCount}, qualifiedPlayers: ${JSON.stringify(newState.qualifiedPlayers)}`);
  console.log(`[endFinalShowdown] playerStatuses (playerId strings): ${JSON.stringify(newState.playerStatuses)}`);
  console.log(`[endFinalShowdown] tournamentScores: ${JSON.stringify(newState.tournamentScores)}`);
  console.log(`[endFinalShowdown] tournamentPhase before processing: ${newState.tournamentPhase}`);
  
  // Validate tournament is in final showdown
  if (!newState.tournamentMode || newState.tournamentMode !== 'knockout') {
    throw new Error('No active knockout tournament');
  }
  
  if (newState.tournamentPhase !== 'FINAL_SHOWDOWN') {
    throw new Error('Tournament is not in FINAL_SHOWDOWN phase');
  }
  
  // Calculate scores for this hand
  // IMPORTANT: Uses playerId strings now!
  console.log(`[endFinalShowdown] Calculating hand scores...`);
  
  for (let i = 0; i < newState.playerCount; i++) {
    const playerId = newState.players[i].id;  // Get playerId string (e.g., 'player_0')
    
    // Check status using the playerId string
    if (newState.playerStatuses[playerId] === 'ACTIVE') {
      const handScore = calculateScore(newState.players[i].captures);
      newState.tournamentScores[playerId] = (newState.tournamentScores[playerId] || 0) + handScore;
      console.log(`[endFinalShowdown] Player ${playerId}: hand score ${handScore}, total ${newState.tournamentScores[playerId]}`);
    }
  }
  
  // Increment hands played
  newState.finalShowdownHandsPlayed = (newState.finalShowdownHandsPlayed || 0) + 1;
  console.log(`[endFinalShowdown] Hands played: ${newState.finalShowdownHandsPlayed}/2`);
  
  // Check if we've played 2 hands
  if (newState.finalShowdownHandsPlayed >= 2) {
    // Determine winner using playerId strings
    const activePlayers = [];
    for (let i = 0; i < newState.playerCount; i++) {
      const playerId = newState.players[i].id;
      if (newState.playerStatuses[playerId] === 'ACTIVE') {
        activePlayers.push({ 
          playerId: playerId,  // Use playerId string!
          score: newState.tournamentScores[playerId] 
        });
      }
    }
    
    if (activePlayers.length !== 2) {
      throw new Error('Final showdown requires exactly 2 players');
    }
    
    // Compare scores - HIGHER score wins
    activePlayers.sort((a, b) => b.score - a.score); // Descending
    
    const winner = activePlayers[0].playerId;
    const loser = activePlayers[1].playerId;
    
    console.log(`[endFinalShowdown] === TOURNAMENT FINAL RESULTS ===`);
    console.log(`[endFinalShowdown] Active players with scores:`);
    activePlayers.forEach((p, i) => {
      console.log(`  [${i}] playerId=${p.playerId}, score=${p.score}`);
    });
    console.log(`[endFinalShowdown] Winner (playerId): ${winner}`);
    console.log(`[endFinalShowdown] Loser (playerId): ${loser}`);
    console.log(`[endFinalShowdown] Player statuses BEFORE update: ${JSON.stringify(newState.playerStatuses)}`);
    
    // Update statuses - using playerId strings
    newState.playerStatuses[winner] = 'WINNER';
    newState.playerStatuses[loser] = 'ELIMINATED';
    newState.tournamentWinner = winner;  // Now stores playerId string!
    newState.tournamentPhase = 'COMPLETED';
    
    console.log(`[endFinalShowdown] Player statuses AFTER update: ${JSON.stringify(newState.playerStatuses)}`);
    console.log(`[endFinalShowdown] tournamentWinner set to: ${winner}`);
    console.log(`[endFinalShowdown] tournamentPhase set to: COMPLETED`);
    
    return newState;
  }
  
  // Start next hand (reset table but keep scores)
  console.log(`[endFinalShowdown] Starting hand ${newState.finalShowdownHandsPlayed + 1}`);
  
  // Reset for next hand while keeping tournament state
  // IMPORTANT: Need to preserve player identities using playerId strings!
  const resetState = initializeGame(newState.playerCount, newState.gameMode === 'party');
  
  // Preserve tournament state - including playerId-based playerStatuses and tournamentScores
  resetState.tournamentMode = newState.tournamentMode;
  resetState.tournamentPhase = newState.tournamentPhase;
  resetState.tournamentRound = newState.tournamentRound;
  resetState.playerStatuses = newState.playerStatuses;  // Keep playerId-based statuses!
  resetState.tournamentScores = newState.tournamentScores;  // Keep playerId-based scores!
  resetState.eliminationOrder = newState.eliminationOrder;
  resetState.finalShowdownHandsPlayed = newState.finalShowdownHandsPlayed;
  resetState.tournamentWinner = newState.tournamentWinner;
  resetState.qualifiedPlayers = newState.qualifiedPlayers;  // Keep playerId strings!
  
  // IMPORTANT: Recreate players array with correct playerId strings
  // The initializeGame creates players with id 'player_0', 'player_1', etc.
  // We need to map them to the correct playerId strings from qualifiedPlayers
  if (newState.qualifiedPlayers && newState.qualifiedPlayers.length > 0) {
    for (let i = 0; i < resetState.playerCount && i < newState.qualifiedPlayers.length; i++) {
      const targetPlayerId = newState.qualifiedPlayers[i];
      resetState.players[i].id = targetPlayerId;
      console.log(`[endFinalShowdown] Remapped player ${i} to playerId ${targetPlayerId}`);
    }
  }
  
  console.log(`[endFinalShowdown] Hand ${resetState.finalShowdownHandsPlayed + 1} starting`);
  console.log(`[endFinalShowdown] AFTER initializeGame - players.length: ${resetState.players?.length}, playerCount: ${resetState.playerCount}`);
  console.log(`[endFinalShowdown] Players array:`, resetState.players?.map(p => p.id));
  
  return resetState;
}

module.exports = endFinalShowdown;
