/**
 * Game End Logic
 * Handles end-of-game cleanup and final score calculation
 */

const { cloneState } = require('./clone');

// Note: We import scoring dynamically inside the function to avoid circular dependencies
// const { updateScores } = require('../multiplayer/server/game/scording');

/**
 * End-of-game cleanup: give remaining table cards to the player who made the last capture.
 * Then calculate final scores and mark game over.
 * 
 * @param {object} state - Current game state
 * @returns {object} Updated state with table cards awarded to last capturer
 */
function finalizeGame(state) {
  const newState = cloneState(state);

  // Only proceed if game is actually over (deck empty and all hands empty)
  const deckEmpty = newState.deck.length === 0;
  const allHandsEmpty = newState.players.every(p => p.hand.length === 0);

  if (!deckEmpty || !allHandsEmpty) {
    console.warn('[gameEnd] finalizeGame called but game not finished - deck empty:', deckEmpty, 'hands empty:', allHandsEmpty);
    return newState;
  }

  const lastPlayer = newState.lastCapturePlayer;
  if (lastPlayer === null || lastPlayer === undefined) {
    console.warn('[gameEnd] finalizeGame: No last capture player - table cards remain unclaimed');
    newState.gameOver = true;
    return newState;
  }

  // Move all table cards (loose cards and stacks) to the last player's captures
  const tableCards = newState.tableCards;
  if (tableCards.length > 0) {
    newState.players[lastPlayer].captures.push(...tableCards);
    newState.tableCards = []; // clear table
    console.log(`[gameEnd] finalizeGame: Awarded ${tableCards.length} table cards to player ${lastPlayer}`);
  }

  // Calculate final scores
  // Dynamic import to avoid circular dependency
  const { updateScores } = require('../../multiplayer/server/game/scoring');
  updateScores(newState);

  newState.gameOver = true;
  console.log(`[gameEnd] Game finalized. Last capturer: P${lastPlayer}, final scores:`, newState.scores);
  return newState;
}

module.exports = {
  finalizeGame,
};
