/**
 * choice
 * Handles player choice when there's a capture vs extend option.
 * This is called after player selects from CaptureOrStealModal.
 * 
 * When player chooses 'capture':
 *   - Capture opponent's initial build (small build ≤5)
 *   - Uses captureOpponent logic
 * 
 * When player chooses 'extend':
 *   - Extend/steal the build (add hand card to build)
 *   - Uses stealBuild logic
 */

const { cloneState } = require('../');
const captureOpponent = require('./captureOpponent');
const stealBuild = require('./stealBuild');

function choice(state, payload, playerIndex) {
  const { selectedOption, card, stackId, buildValue, extendedTarget } = payload;

  if (!selectedOption) {
    throw new Error('choice: missing selectedOption (capture or extend)');
  }

  let newState = cloneState(state);
  
  // Clear any pending choice
  newState.pendingChoice = null;
  
  if (selectedOption === 'capture') {
    // Capture opponent's build - use captureOpponent handler
    // The build was created by opponent, so we capture it as opponent's build
    console.log(`[choice] Player ${playerIndex} choosing to CAPTURE build ${stackId} with card ${card.rank}${card.suit}`);
    
    // Call captureOpponent with the card and stackId
    newState = captureOpponent(newState, { card, targetStackId: stackId }, playerIndex);
    
  } else if (selectedOption === 'extend') {
    // Extend/steal the build - use stealBuild handler (changes ownership)
    console.log(`[choice] Player ${playerIndex} choosing to STEAL build ${stackId} with card ${card.rank}${card.suit}`);
    
    // Call stealBuild to add the card to the build
    newState = stealBuild(newState, { card, stackId }, playerIndex);
    
  } else {
    throw new Error(`choice: invalid option "${selectedOption}"`);
  }

  return newState;
}

module.exports = choice;
