/**
 * Minimal test version of shared-game-logic.js
 */

// Simple function test
function determineActions(draggedItem, targetInfo, gameState) {
  console.log('🎲 [SHARED_LOGIC_TEST] Determining actions:', {
    card: draggedItem.card.rank + draggedItem.card.suit,
    source: draggedItem.source,
    target: targetInfo.type,
    currentPlayer: gameState.currentPlayer
  });

  return {
    actions: [{ type: 'test', label: 'Test Action' }],
    requiresModal: false,
    errorMessage: null
  };
}

function initializeGame() {
  return {
    deck: [],
    playerHands: [[], []],
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1
  };
}

module.exports = {
  determineActions,
  initializeGame
};
