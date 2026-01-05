/**
 * Test Same-Value Card Logic
 * Tests the new same-value temp stack rule
 */

const { determineActions } = require('./game/logic/actionDetermination');

// Test scenario: 5♦ hand + 5♣ table + 5♠ and 10♥ in hand
const testGameState = {
  currentPlayer: 0,
  playerHands: [
    [
      { suit: '♦', rank: '5', value: 5 },
      { suit: '♠', rank: '5', value: 5 },
      { suit: '♥', rank: '10', value: 10 }
    ],
    []
  ],
  tableCards: [
    { suit: '♣', rank: '5', value: 5 }
  ]
};

// Simulate dragging 5♦ onto 5♣
const draggedItem = {
  card: { suit: '♦', rank: '5', value: 5 },
  source: 'hand'
};

const targetInfo = {
  type: 'temporary_stack',
  stackId: 'temp-0',
  cards: [
    { suit: '♣', rank: '5', value: 5 },
    { suit: '♦', rank: '5', value: 5 }
  ],
  owner: 0
};

console.log('🧪 Testing Same-Value Card Logic');
console.log('Hand:', testGameState.playerHands[0].map(c => `${c.rank}${c.suit}`));
console.log('Table:', testGameState.tableCards.map(c => `${c.rank}${c.suit}`));
console.log('Temp Stack:', targetInfo.cards.map(c => `${c.rank}${c.suit}`));

try {
  const result = determineActions(draggedItem, targetInfo, testGameState);
  console.log('\n📊 Action Determination Result:');
  console.log('Actions:', result.actions.map(a => ({
    type: a.type,
    description: a.description || 'N/A'
  })));
  console.log('Requires Modal:', result.requiresModal);
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
