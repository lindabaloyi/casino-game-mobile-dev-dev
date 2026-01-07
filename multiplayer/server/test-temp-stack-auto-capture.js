/**
 * Test Temp Stack Auto-Capture
 * Tests that same-value temp stacks auto-capture when no build options exist
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 Testing Temp Stack Auto-Capture');

// Create a game state with a same-value temp stack
const mockGameState = {
  round: 1,
  currentPlayer: 0,
  playerHands: [
    [
      { rank: '7', suit: '♣', value: 7 },
      { rank: '3', suit: '♥', value: 3 }
      // No spare 6s, no 12s (6+6=12) - no build options for 6s
    ],
    []
  ],
  tableCards: [
    {
      type: 'temporary_stack',
      stackId: 'temp-0',
      cards: [
        { rank: '6', suit: '♣', value: 6, source: 'table' },
        { rank: '6', suit: '♠', value: 6, source: 'hand' }
      ],
      owner: 0,
      value: 12,
      combinedValue: 12,
      possibleBuilds: [12],
      isTableToTable: false,
      canAugmentBuilds: false,
      isSameValueStack: true  // This triggers same-value-modal-options rule
    }
  ],
  gameId: 'test-game'
};

console.log('🎮 Game State:');
console.log('  Player Hand:', mockGameState.playerHands[0].map(c => `${c.rank}${c.suit}`));
console.log('  Temp Stack:', {
  id: mockGameState.tableCards[0].stackId,
  cards: mockGameState.tableCards[0].cards.map(c => `${c.rank}${c.suit}`),
  isSameValueStack: mockGameState.tableCards[0].isSameValueStack
});

// Simulate the rule evaluation for the existing temp stack
// The same-value-modal-options rule should trigger for this temp stack
const result = determineActions(
  { card: null, source: null }, // No drag - just evaluating existing state
  {
    type: 'temporary_stack',
    card: mockGameState.tableCards[0], // The temp stack itself
    isSameValueStack: true
  },
  mockGameState
);

console.log('\n📊 RULE EVALUATION RESULT:');
console.log('  Actions found:', result.actions.length);
console.log('  Requires modal:', result.requiresModal);
console.log('  Data packets:', result.dataPackets.length);

if (result.actions.length > 0) {
  console.log('  Action details:');
  result.actions.forEach((action, i) => {
    console.log(`    ${i+1}. Type: ${action.type}`);
    if (action.payload) {
      console.log(`       Payload:`, JSON.stringify(action.payload, null, 2));
    }
  });
}

if (result.dataPackets.length > 0) {
  console.log('  Data packet details:');
  result.dataPackets.forEach((packet, i) => {
    console.log(`    ${i+1}. Type: ${packet.type}`);
    console.log(`       Payload:`, JSON.stringify(packet.payload, null, 2));
  });
}

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('  ✅ same-value-modal-options rule should trigger');
console.log('  ✅ Build options check: hasSpareCard=false, canBuildSum=false (6>5)');
console.log('  ✅ Result: AUTO-CAPTURE (no modal)');
console.log('  ✅ captureType: "same_value_auto_capture"');

console.log('\n✅ Test completed!');