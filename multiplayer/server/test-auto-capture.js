/**
 * Test Same-Value Auto-Capture
 * Tests that same-value cards auto-capture when no build options exist
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 Testing Same-Value Auto-Capture');

// Mock game state
const mockGameState = {
  round: 1,
  currentPlayer: 0,
  playerHands: [],
  tableCards: []
};

// Test Case 1: 5♠ on 5♣ with no build options (should auto-capture)
console.log('\n=== Test Case 1: Auto-capture (no build options) ===');

mockGameState.playerHands = [
  [
    { rank: '5', suit: '♠', value: 5 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: '3', suit: '♥', value: 3 }
    // No spare 5s, no 10s - no build options
  ],
  []
];
mockGameState.tableCards = [
  { rank: '5', suit: '♣', value: 5 }
];

const context1 = {
  draggedItem: {
    card: { rank: '5', suit: '♠', value: 5 },
    source: 'hand'
  },
  targetInfo: {
    type: 'loose',
    card: { rank: '5', suit: '♣', value: 5 }
  },
  gameState: mockGameState,
  currentPlayer: 0
};

const actions1 = determineActions(context1.draggedItem, context1.targetInfo, context1.gameState);
console.log('Actions found:', actions1.actions.length);
if (actions1.actions.length > 0) {
  console.log('First action:', {
    type: actions1.actions[0].type,
    requiresModal: actions1.requiresModal,
    payloadKeys: Object.keys(actions1.actions[0].payload || {})
  });
}

// Test Case 2: 5♠ on 5♣ with build options (should NOT auto-capture)
console.log('\n=== Test Case 2: Modal options (has build options) ===');

mockGameState.playerHands = [
  [
    { rank: '5', suit: '♠', value: 5 },
    { rank: '5', suit: '♥', value: 5 }, // Spare 5 - build option!
    { rank: '10', suit: '♦', value: 10 } // Sum card - build option!
  ],
  []
];
mockGameState.tableCards = [
  { rank: '5', suit: '♣', value: 5 }
];

const context2 = {
  draggedItem: {
    card: { rank: '5', suit: '♠', value: 5 },
    source: 'hand'
  },
  targetInfo: {
    type: 'loose',
    card: { rank: '5', suit: '♣', value: 5 }
  },
  gameState: mockGameState,
  currentPlayer: 0
};

const actions2 = determineActions(context2.draggedItem, context2.targetInfo, context2.gameState);
console.log('Actions found:', actions2.actions.length);
if (actions2.actions.length > 0) {
  console.log('First action:', {
    type: actions2.actions[0].type,
    requiresModal: actions2.requiresModal,
    payloadKeys: Object.keys(actions2.actions[0].payload || {})
  });
}

// Test Case 3: 9♠ on 9♣ (high value, no sum builds possible)
console.log('\n=== Test Case 3: Auto-capture (high value) ===');

mockGameState.playerHands = [
  [
    { rank: '9', suit: '♠', value: 9 },
    { rank: '7', suit: '♣', value: 7 },
    { rank: '3', suit: '♥', value: 3 }
    // No spare 9s, high value (no sum builds) - no build options
  ],
  []
];
mockGameState.tableCards = [
  { rank: '9', suit: '♣', value: 9 }
];

const context3 = {
  draggedItem: {
    card: { rank: '9', suit: '♠', value: 9 },
    source: 'hand'
  },
  targetInfo: {
    type: 'loose',
    card: { rank: '9', suit: '♣', value: 9 }
  },
  gameState: mockGameState,
  currentPlayer: 0
};

const actions3 = determineActions(context3.draggedItem, context3.targetInfo, context3.gameState);
console.log('Actions found:', actions3.actions.length);
if (actions3.actions.length > 0) {
  console.log('First action:', {
    type: actions3.actions[0].type,
    requiresModal: actions3.requiresModal,
    payloadKeys: Object.keys(actions3.actions[0].payload || {})
  });
}

console.log('\n✅ Test completed!');