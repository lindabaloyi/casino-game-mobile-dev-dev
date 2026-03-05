/**
 * GameState (Shared)
 * Pure functions for game state manipulation.
 * 
 * These are used by all action handlers to ensure consistent state cloning.
 */

const { cloneDeep } = require('../utils/cloneDeep');

/**
 * Deep clone game state for pure function updates
 */
function cloneState(state) {
  return cloneDeep(state);
}

/**
 * Advance turn to the next player
 */
function nextTurn(state) {
  const totalPlayers = state.playerHands.length;
  state.currentPlayer = (state.currentPlayer + 1) % totalPlayers;
  return state;
}

/**
 * Get the current player index
 */
function getCurrentPlayer(state) {
  return state.currentPlayer;
}

/**
 * Check if it's a specific player's turn
 */
function isPlayerTurn(state, playerIndex) {
  return state.currentPlayer === playerIndex;
}

module.exports = {
  cloneState,
  nextTurn,
  getCurrentPlayer,
  isPlayerTurn,
};
