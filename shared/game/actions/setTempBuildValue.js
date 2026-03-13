/**
 * setTempBuildValue
 * Player taps a temp stack to fix its target value (dual build).
 */

const { cloneState, nextTurn } = require('../');

function setTempBuildValue(state, payload, playerIndex) {
  const { stackId, value } = payload;

  console.log('[setTempBuildValue] ===== FUNCTION ENTRY =====');
  console.log('[setTempBuildValue] Input - stackId:', stackId);
  console.log('[setTempBuildValue] Input - value:', value);
  console.log('[setTempBuildValue] Input - playerIndex:', playerIndex);

  if (!stackId) {
    throw new Error('setTempBuildValue: missing stackId');
  }

  if (value === undefined || value === null) {
    throw new Error('setTempBuildValue: missing value');
  }

  const newState = cloneState(state);

  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`setTempBuildValue: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];

  console.log('[setTempBuildValue] Stack found:', {
    stackId: stack.stackId,
    owner: stack.owner,
    value: stack.value,
    base: stack.base,
    need: stack.need,
    cards: stack.cards.map(c => `${c.rank}${c.suit}`).join(',')
  });

  // Validate player owns the stack
  if (stack.owner !== playerIndex) {
    throw new Error(`setTempBuildValue: player ${playerIndex} does not own stack "${stackId}"`);
  }

  // Check if already fixed
  if (stack.baseFixed) {
    console.log('[setTempBuildValue] Stack is already fixed with value:', stack.value);
    // Already fixed, just return
    return newState;
  }

  // Set the fixed value
  console.log('[setTempBuildValue] Setting fixed value:', value);
  stack.value = value;
  stack.baseFixed = true;
  
  // Initialize pending extension
  stack.pendingExtension = { cards: [] };
  
  console.log('[setTempBuildValue] Updated stack:', {
    stackId: stack.stackId,
    value: stack.value,
    baseFixed: stack.baseFixed,
    pendingExtension: stack.pendingExtension
  });

  return newState;
}

module.exports = setTempBuildValue;
