/**
 * endTurn
 * Manually ends the current player's turn.
 * Used for multi-action turns (e.g., after createTemp).
 */

const { cloneState, nextTurn, endPlayerTurn } = require('../');

function endTurn(state, payload, playerIndex) {
  console.log(`[endTurn] Player ${playerIndex} explicitly ending turn, turnCounter before: ${state.turnCounter}`);
  
  const newState = cloneState(state);
  
  // Mark turn as explicitly ended
  endPlayerTurn(newState, playerIndex);
  
  console.log(`[endTurn] Player ${playerIndex} turnEnded = true, proceeding to nextTurn`);
  
  const totalPlayers = newState.players.length;
  newState.currentPlayer = (playerIndex + 1) % totalPlayers;
  return newState;
}

module.exports = endTurn;
