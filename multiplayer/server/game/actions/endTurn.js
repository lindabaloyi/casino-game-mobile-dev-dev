/**
 * endTurn
 * Manually ends the current player's turn.
 * 
 * Payload: empty (no payload required)
 * 
 * Rules:
 * - Can be called at any time during player's turn
 * - Advances turn to next player
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {object} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function endTurn(state, payload, playerIndex) {
  const newState = cloneState(state);

  console.log(`[endTurn] Player ${playerIndex} manually ending their turn`);

  // Advance turn to the next player
  const totalPlayers = newState.playerHands.length;
  newState.currentPlayer = (playerIndex + 1) % totalPlayers;

  console.log(`[endTurn] Turn advanced to player ${newState.currentPlayer}`);

  return newState;
}

module.exports = endTurn;
