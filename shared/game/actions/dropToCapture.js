/**
 * dropToCapture
 * Player drops a temp stack or build with pending extension onto their own capture pile.
 */

const { cloneState, nextTurn, finalizeGame } = require('../');

function dropToCapture(state, payload, playerIndex) {
  const { stackId, stackType, source } = payload;

  console.log(`[dropToCapture] playerIndex: ${playerIndex}, stackId: ${stackId}, stackType: ${stackType}, source: ${source}`);

  if (!stackId) {
    throw new Error('dropToCapture: missing stackId');
  }

  const newState = cloneState(state);

  // Handle temp_stack
  if (!stackType || stackType === 'temp_stack') {
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
    newState.players[playerIndex].captures.push(...capturedCards);

    // Track last capture for end-of-game cleanup
    newState.lastCapturePlayer = playerIndex;

    const resultState = nextTurn(newState);
    
    // Check if game is over (deck empty and all hands empty)
    const deckEmpty = resultState.deck.length === 0;
    const allHandsEmpty = resultState.players.every(p => p.hand.length === 0);
    
    if (deckEmpty && allHandsEmpty) {
      return finalizeGame(resultState);
    }
    
    return resultState;
  }

  // Handle build_stack with pending extension
  if (stackType === 'build_stack') {
    const stackIdx = newState.tableCards.findIndex(
      tc => tc.type === 'build_stack' && tc.stackId === stackId,
    );

    if (stackIdx === -1) {
      throw new Error(`dropToCapture: build stack "${stackId}" not found`);
    }

    const stack = newState.tableCards[stackIdx];

    // Only allow capturing own build if there's a pending extension
    if (stack.owner !== playerIndex) {
      throw new Error(`dropToCapture: player ${playerIndex} does not own build "${stackId}"`);
    }

    // Check if there's a pending extension
    const hasPendingExtension = stack.pendingExtension && 
      (stack.pendingExtension.looseCard || stack.pendingExtension.cards);
    
    if (!hasPendingExtension) {
      throw new Error(`dropToCapture: build "${stackId}" has no pending extension to capture`);
    }

    // Collect all cards from the build (base cards + pending extension)
    const buildCards = [...stack.cards];
    
    // Add pending extension cards
    if (stack.pendingExtension.cards) {
      buildCards.push(...stack.pendingExtension.cards.map(p => p.card));
    } else if (stack.pendingExtension.looseCard) {
      buildCards.push(stack.pendingExtension.looseCard);
    }

    // Remove the build from table
    newState.tableCards.splice(stackIdx, 1);
    
    // Add to player's captures
    newState.players[playerIndex].captures.push(...buildCards);

    // Track last capture for end-of-game cleanup
    newState.lastCapturePlayer = playerIndex;

    const resultState = nextTurn(newState);
    
    // Check if game is over (deck empty and all hands empty)
    const deckEmpty = resultState.deck.length === 0;
    const allHandsEmpty = resultState.players.every(p => p.hand.length === 0);
    
    if (deckEmpty && allHandsEmpty) {
      return finalizeGame(resultState);
    }
    
    return resultState;
  }

  throw new Error(`dropToCapture: unsupported stack type "${stackType}"`);
}

module.exports = dropToCapture;
