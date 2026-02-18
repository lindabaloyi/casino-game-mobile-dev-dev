/**
 * acceptTemp
 * Player accepts their pending temp stack — the stack stays on the table
 * and the turn advances to the opponent.
 *
 * Rules:
 *  - Player must own an active temp stack
 *  - It must be that player's turn
 *  - Turn advances after acceptance
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptTemp(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) throw new Error('acceptTemp: missing stackId');

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`acceptTemp: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];
  if (stack.owner !== playerIndex) {
    throw new Error(`acceptTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  // Temp stack stays exactly as-is — no mutation needed
  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
