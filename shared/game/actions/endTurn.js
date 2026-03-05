/**
 * endTurn
 * Manually ends the current player's turn.
 */

const { cloneState } = require('../GameState');

function endTurn(state, payload, playerIndex) {
  const newState = cloneState(state);
  const totalPlayers = newState.players.length;
  newState.currentPlayer = (playerIndex + 1) % totalPlayers;
  return newState;
}

module.exports = endTurn;
