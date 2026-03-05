/**
 * dropToCapture
 * Player drops a temp stack onto their own capture pile.
 */

const { cloneState, nextTurn } = require('../GameState');

function dropToCapture(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) {
    throw new Error('dropToCapture: missing stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`dropToCapture: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];

  if (stack.owner !== playerIndex) {
    throw new Error(`dropToCapture: player ${playerIndex} does not own stack "${stackId}"`);
  }

  newState.tableCards.splice(stackIdx, 1);
  const capturedCards = [...stack.cards];
  newState.playerCaptures[playerIndex].push(...capturedCards);

  return nextTurn(newState);
}

module.exports = dropToCapture;
