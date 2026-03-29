/**
 * choice
 * Handles player choice when there's a capture vs extend option.
 * This is called after player selects from CaptureOrStealModal.
 */

const { cloneState } = require('../');

function choice(state, payload, playerIndex) {
  const { selectedOption, card, stackId, buildValue, extendedTarget } = payload;

  if (!selectedOption) {
    throw new Error('choice: missing selectedOption (capture or extend)');
  }

  const newState = cloneState(state);
  
  // Clear any pending choice
  newState.pendingChoice = null;
  
  if (selectedOption === 'capture') {
    // Return capture action - will be handled by captureOpponent
    // The actual capture will happen on next action
    newState.lastAction = {
      type: 'captureOpponent',
      payload: { card, targetStackId: stackId }
    };
  } else if (selectedOption === 'extend') {
    // Return extend action - will be handled by stealBuild
    newState.lastAction = {
      type: 'stealBuild',
      payload: { card, stackId }
    };
  } else {
    throw new Error(`choice: invalid option "${selectedOption}"`);
  }

  return newState;
}

module.exports = choice;