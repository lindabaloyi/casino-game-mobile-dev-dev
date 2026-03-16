/**
 * dropToCapture
 * Player drops a temp stack or build with pending extension onto their own capture pile.
 */

const { cloneState, nextTurn, finalizeGame } = require('../');

/**
 * Checks if a set of cards forms a valid capture.
 * Valid if ANY of these patterns match:
 * 1. Cards can be grouped from left to right where each group sums to its start card
 * 2. A card at position i has cards before it summing to its value
 * 
 * Examples:
 * - 9,1,10: 10 (capture) has 9+1=10 before it ✓
 * - 7,5,2,7: First 7 captures 5+2=7, remaining 7 ✓
 * - 10,6,3,1,10,10: First 10 captures 6+3+1=10, remaining 10+10 ✓
 * - 9,8,1: First 9 captures 8+1=9 ✓
 * 
 * @param {Array} cards - Array of card objects with `value` property.
 * @returns {boolean}
 */
function isValidCaptureSet(cards) {
  if (!cards || cards.length < 2) return false;
  
  const values = cards.map(c => c.value || c);
  
  // Check pattern 2: card at position i has cards BEFORE summing to it
  // (capture card is at end or middle)
  for (let i = 1; i < values.length; i++) {
    const target = values[i];
    const before = values.slice(0, i);
    const sumBefore = before.reduce((a, b) => a + b, 0);
    const after = values.slice(i + 1);
    
    if (sumBefore === target) {
      // Cards after must all equal target (single card captures)
      if (after.length === 0 || after.every(v => v === target)) {
        return true;
      }
    }
  }
  
  // Check pattern 1: process left to right, building groups
  for (let startIdx = 0; startIdx < values.length; startIdx++) {
    const target = values[startIdx];
    let currentSum = 0;
    let valid = true;
    let hasCapture = false;
    
    for (let i = startIdx + 1; i < values.length; i++) {
      currentSum += values[i];
      
      if (currentSum > target) {
        valid = false;
        break;
      }
      
      if (currentSum === target) {
        hasCapture = true;
        currentSum = 0;
      }
    }
    
    if (valid && hasCapture && (currentSum === 0 || currentSum === target)) {
      return true;
    }
  }
  
  return false;
}

function dropToCapture(state, payload, playerIndex) {
  const { stackId, stackType, source } = payload;

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

    // Skip all validations - just accept the drop

    newState.tableCards.splice(stackIdx, 1);
    const capturedCards = [...stack.cards];
    
    // ==== SHIYA RECALL CHECK FOR TEMP_STACK ====
    // When player drops their own temp stack (with Shiya activated by teammate) to capture,
    // create a recall offer for the teammate who activated Shiya
    if (stack.shiyaActive && stack.shiyaPlayer !== undefined) {
      const activator = stack.shiyaPlayer;
      
      console.log(`[dropToCapture] ✅ Shiya active on temp stack! Creating recall for player ${activator}`);
      
      // Ensure shiyaRecalls exists
      if (!newState.shiyaRecalls) {
        newState.shiyaRecalls = {};
      }
      
      // Support multiple recalls per player by using stackId as key
      if (!newState.shiyaRecalls[activator]) {
        newState.shiyaRecalls[activator] = {};
      }
      
      // Store recall info
      newState.shiyaRecalls[activator][stack.stackId] = {
        stackId: stack.stackId,
        value: stack.value,
        base: stack.base,
        need: stack.need,
        buildType: stack.buildType,
        capturedBy: playerIndex,  // The player who dropped the stack
        originalOwner: stack.owner,  // The original owner of the stack
        buildCards: capturedCards.map(c => ({ ...c })),  // Copy captured cards
        captureCards: [],  // Empty for dropToCapture (no single capture card)
        expiresAt: Date.now() + 4000, // 4 second window
      };
      
      console.log(`[dropToCapture] ✅ Created Shiya recall:`, JSON.stringify(newState.shiyaRecalls[activator][stack.stackId]));
    }
    
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

    // Skip all validations - just accept the drop

    // Collect all cards from the build (base cards + pending extension)
    const buildCards = [...stack.cards];
    
    // Add pending extension cards
    if (stack.pendingExtension.cards) {
      buildCards.push(...stack.pendingExtension.cards.map(p => p.card));
    } else if (stack.pendingExtension.looseCard) {
      buildCards.push(stack.pendingExtension.looseCard);
    }

    // Skip validation - allow all drops to capture

    // ==== SHIYA RECALL CHECK FOR BUILD_STACK ====
    // When player drops their own build (with Shiya activated by teammate) to capture,
    // create a recall offer for the teammate who activated Shiya
    if (stack.shiyaActive && stack.shiyaPlayer !== undefined) {
      const activator = stack.shiyaPlayer;
      
      console.log(`[dropToCapture] ✅ Shiya active on build stack! Creating recall for player ${activator}`);
      
      // Ensure shiyaRecalls exists
      if (!newState.shiyaRecalls) {
        newState.shiyaRecalls = {};
      }
      
      // Support multiple recalls per player by using stackId as key
      if (!newState.shiyaRecalls[activator]) {
        newState.shiyaRecalls[activator] = {};
      }
      
      // Store recall info
      newState.shiyaRecalls[activator][stack.stackId] = {
        stackId: stack.stackId,
        value: stack.value,
        base: stack.base,
        need: stack.need,
        buildType: stack.buildType,
        capturedBy: playerIndex,  // The player who dropped the build
        originalOwner: stack.owner,  // The original owner of the build
        buildCards: buildCards.map(c => ({ ...c })),  // Copy build cards
        captureCards: [],  // Empty for dropToCapture (no single capture card)
        expiresAt: Date.now() + 4000, // 4 second window
      };
      
      console.log(`[dropToCapture] ✅ Created Shiya recall:`, JSON.stringify(newState.shiyaRecalls[activator][stack.stackId]));
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
