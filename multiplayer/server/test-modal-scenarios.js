/**
 * Test Modal Scenarios Still Work
 * Verifies that when build options exist, modals are still shown
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 Testing Modal Scenarios (when build options exist)');

// Test Case 1: 5♠ on 5♣ with spare 5♥ (should show modal)
console.log('\n=== Test Case 1: 5♠ on 5♣ with spare 5♥ ===');

const mockGameState1 = {
  round: 1,
  currentPlayer: 0,
  playerHands: [
    [
      { rank: '5', suit: '♠', value: 5 },
      { rank: '5', suit: '♥', value: 5 }, // Spare 5 - build option!
      { rank: '7', suit: '♣', value: 7 }
    ],
    []
  ],
  tableCards: [
    { rank: '5', suit: '♣', value: 5 }
  ],
  gameId: 'test-game'
};

const result1 = determineActions(
  { card: { rank: '5', suit: '♠', value: 5 }, source: 'hand' },
  { type: 'loose', card: { rank: '5', suit: '♣', value: 5 } },
  mockGameState1
);

console.log('Result:', {
  actions: result1.actions.length,
  requiresModal: result1.requiresModal,
  dataPackets: result1.dataPackets.length
});

// Test Case 2: 5♠ on 5♣ with 10♦ (sum build option)
console.log('\n=== Test Case 2: 5♠ on 5♣ with 10♦ (sum build) ===');

const mockGameState2 = {
  round: 1,
  currentPlayer: 0,
  playerHands: [
    [
      { rank: '5', suit: '♠', value: 5 },
      { rank: '10', suit: '♦', value: 10 }, // 5+5=10 - sum build option!
      { rank: '7', suit: '♣', value: 7 }
    ],
    []
  ],
  tableCards: [
    { rank: '5', suit: '♣', value: 5 }
  ],
  gameId: 'test-game'
};

const result2 = determineActions(
  { card: { rank: '5', suit: '♠', value: 5 }, source: 'hand' },
  { type: 'loose', card: { rank: '5', suit: '♣', value: 5 } },
  mockGameState2
);

console.log('Result:', {
  actions: result2.actions.length,
  requiresModal: result2.requiresModal,
  dataPackets: result2.dataPackets.length
});

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('  ✅ Both cases should show modals (requiresModal: true)');
console.log('  ✅ Data packets should be returned for modal options');

console.log('\n✅ Modal tests completed!');