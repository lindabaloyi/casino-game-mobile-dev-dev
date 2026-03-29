/**
 * endTurn
 * Manually ends the current player's turn.
 * Used for multi-action turns (e.g., after createTemp).
 * 
 * If there's a pending temp stack, it will be accepted first before ending the turn.
 */

const { cloneState, nextTurn, endPlayerTurn } = require('../');
const { getConsecutivePartition } = require('../buildCalculator');

function endTurn(state, payload, playerIndex) {
  console.log(`[endTurn] Player ${playerIndex} explicitly ending turn, turnCounter before: ${state.turnCounter}`);
  
  const newState = cloneState(state);
  
  // Check if there's a pending temp stack - if so, accept it first
  const tempStacks = newState.tableCards.filter(tc => tc.type === 'temp_stack' && tc.owner === playerIndex);
  
  if (tempStacks.length > 0) {
    console.log(`[endTurn] Found ${tempStacks.length} pending temp stack(s), accepting first one`);
    
    // Accept the first pending temp stack
    const stackToAccept = tempStacks[0];
    
    // Convert temp stack to build stack (same logic as acceptTemp)
    stackToAccept.type = 'build_stack';
    stackToAccept.stackId = stackToAccept.stackId.replace('temp', 'build');
    
    // Determine hasBase from partition
    const stackValues = stackToAccept.cards.map(c => c.value);
    const buildValue = stackToAccept.value;
    const groups = getConsecutivePartition(stackValues, buildValue);
    stackToAccept.hasBase = groups.length > 1;
    
    console.log(`[endTurn] Accepted temp stack ${stackToAccept.stackId}, converted to build`);
  }
  
  // Mark turn as explicitly ended
  endPlayerTurn(newState, playerIndex);
  
  console.log(`[endTurn] Player ${playerIndex} turnEnded = true, proceeding to nextTurn`);
  
  // Advance to next turn
  const resultState = nextTurn(newState);
  
  // Check if game is over (deck empty and all hands empty)
  const deckEmpty = resultState.deck.length === 0;
  const allHandsEmpty = resultState.players.every(p => p.hand.length === 0);
  
  if (deckEmpty && allHandsEmpty) {
    // Import dynamically to avoid circular dependency
    const { finalizeGame } = require('../gameEnd');
    return finalizeGame(resultState);
  }
  
  return resultState;
}

module.exports = endTurn;
