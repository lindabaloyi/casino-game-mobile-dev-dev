/**
 * Test 6 on 6 Auto-Capture Debug
 * Tests the exact scenario you described: dropping 6♠ on 6♣ with no build options
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 Testing 6♠ on 6♣ Auto-Capture Debug');

// Mock game state - exactly as you described
const mockGameState = {
  round: 1,
  currentPlayer: 0,
  playerHands: [
    [
      { rank: '6', suit: '♠', value: 6 },
      { rank: '7', suit: '♣', value: 7 },
      { rank: '3', suit: '♥', value: 3 }
      // No spare 6s, no 12s (6+6=12, but 6>5 so no sum builds)
    ],
    []
  ],
  tableCards: [
    { rank: '6', suit: '♣', value: 6 }
  ],
  gameId: 'test-game'
};

console.log('🎮 Game State:');
console.log('  Player Hand:', mockGameState.playerHands[0].map(c => `${c.rank}${c.suit}`));
console.log('  Table:', mockGameState.tableCards.map(c => `${c.rank}${c.suit}`));
console.log('  Current Player:', mockGameState.currentPlayer);

// Test the drag action
const draggedItem = {
  card: { rank: '6', suit: '♠', value: 6 },
  source: 'hand'
};

const targetInfo = {
  type: 'loose',
  card: { rank: '6', suit: '♣', value: 6 }
};

console.log('\n🎯 Testing Action:');
console.log('  Drag:', `${draggedItem.card.rank}${draggedItem.card.suit} from ${draggedItem.source}`);
console.log('  Target:', `${targetInfo.card.rank}${targetInfo.card.suit} (${targetInfo.type})`);

const result = determineActions(draggedItem, targetInfo, mockGameState);

console.log('\n📊 FINAL RESULT:');
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
console.log('  ✅ Auto-capture should trigger (no build options)');
console.log('  ✅ requiresModal should be false');
console.log('  ✅ Should capture both 6♠ and 6♣ immediately');

console.log('\n✅ Test completed!');