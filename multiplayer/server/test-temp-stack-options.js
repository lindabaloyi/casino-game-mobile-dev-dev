/**
 * Test Temp Stack Options Logic
 * Tests the fixed temp stack options calculation
 */

const { determineActions } = require('./game/logic/actionDetermination');

// Test scenario: Temp stack [3♣, 3♠] + player hand [3♦, 6♠]
// Should generate: Capture 3, Build 3, Build 6
const testGameState = {
  currentPlayer: 0,
  playerHands: [
    [
      { suit: '♦', rank: '3', value: 3 },
      { suit: '♠', rank: '6', value: 6 }
    ],
    []
  ],
  tableCards: []
};

// Simulate evaluating options for existing temp stack (no drag operation)
const draggedItem = null; // No card being dragged

const targetInfo = {
  type: 'temporary_stack',
  stackId: 'temp-0',
  cards: [
    { suit: '♣', rank: '3', value: 3 },
    { suit: '♠', rank: '3', value: 3 }
  ],
  owner: 0,
  isSameValueStack: true // This flag triggers the same-value rule
};

console.log('🧪 Testing Temp Stack Options Logic');
console.log('Hand:', testGameState.playerHands[0].map(c => `${c.rank}${c.suit}`));
console.log('Temp Stack:', targetInfo.cards.map(c => `${c.rank}${c.suit}`));
console.log('Is Same-Value Stack:', targetInfo.isSameValueStack);

try {
  const result = determineActions(draggedItem, targetInfo, testGameState);
  console.log('\n📊 Action Determination Result:');
  console.log('Actions:', result.actions.map(a => ({
    type: a.type,
    description: a.description || 'N/A'
  })));
  console.log('Requires Modal:', result.requiresModal);
  console.log('Data Packets:', result.dataPackets?.length || 0);

  if (result.dataPackets && result.dataPackets.length > 0) {
    result.dataPackets.forEach((packet, index) => {
      console.log(`\n📦 Data Packet ${index + 1}:`);
      console.log('Type:', packet.type);
      if (packet.type === 'showTempStackOptions') {
        console.log('Temp Stack ID:', packet.payload.tempStackId);
        console.log('Available Options:');
        packet.payload.availableOptions.forEach((option, i) => {
          console.log(`  ${i + 1}. ${option.label} (${option.type})`);
        });
      }
    });
  }

  // Expected: Capture 3, Build 3, Build 6
  const expectedOptions = ['Capture 3', 'Build 3', 'Build 6'];
  if (result.dataPackets && result.dataPackets[0]) {
    const actualOptions = result.dataPackets[0].payload.availableOptions.map(o => o.label);
    console.log('\n✅ Expected options:', expectedOptions);
    console.log('✅ Actual options:', actualOptions);

    const optionsMatch = expectedOptions.every(expected =>
      actualOptions.includes(expected)
    );

    if (optionsMatch) {
      console.log('🎉 TEST PASSED: All expected options generated!');
    } else {
      console.log('❌ TEST FAILED: Options mismatch');
    }
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
}
