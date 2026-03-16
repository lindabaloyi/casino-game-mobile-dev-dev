/**
 * cancelCapture
 * Discard pending capture and return all cards to their original locations.
 */

const { cloneState } = require('../');

function cancelCapture(state, payload, playerIndex) {
  const { stackId } = payload;

  console.log('[cancelCapture]', { stackId, playerIndex });

  if (!stackId) throw new Error('cancelCapture: missing stackId');

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`cancelCapture: build stack "${stackId}" not found`);

  const buildStack = newState.tableCards[stackIdx];
  if (!buildStack.pendingCapture) throw new Error('cancelCapture: no pending capture');

  // Restore each card to its source
  for (const item of buildStack.pendingCapture.cards) {
    const card = item.card;
    const source = item.source;
    if (source === 'table') {
      newState.tableCards.push(card);
    } else if (source === 'hand') {
      newState.players[playerIndex].hand.push(card);
    }
    // Note: captured cards are not handled since capture only supports hand and table
  }

  delete buildStack.pendingCapture;
  console.log('[cancelCapture] Success – pending capture cleared');

  return newState;
}

module.exports = cancelCapture;
