/**
 * Test Temp Stack Modal (when build options exist)
 * Tests that same-value temp stacks show modal when build options exist
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 Testing Temp Stack Modal (with build options)');

// Create a game state with a same-value temp stack BUT player has build options
const mockGameState = {
  round: 1,
  currentPlayer: 0,
  playerHands: [
    [
      { rank: '6', suit: '♦', value: 6 }, // Spare 6 available!
      { rank: '7', suit: '♣', value: 7 }
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
      isSameValueStack: true
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

// Test rule evaluation for existing temp stack
const result = determineActions(
  { card: null, source: null },
  {
    type: 'temporary_stack',
    card: mockGameState.tableCards[0],
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
  });
}

if (result.dataPackets.length > 0) {
  console.log('  Data packet details:');
  result.dataPackets.forEach((packet, i) => {
    console.log(`    ${i+1}. Type: ${packet.type}`);
    if (packet.payload?.availableOptions) {
      console.log(`       Options:`, packet.payload.availableOptions.map(o => o.label));
    }
  });
}

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('  ✅ same-value-modal-options rule should trigger');
console.log('  ✅ Build options check: hasSpareCard=true (has 6♦)');
console.log('  ✅ Result: SHOW MODAL with capture + build options');

console.log('\n✅ Test completed!');