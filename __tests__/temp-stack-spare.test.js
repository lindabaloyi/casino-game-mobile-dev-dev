/**
 * Temp Stack Spare Check Test Suite
 * Tests the smart routing for temp stack drops with spare card detection.
 * 
 * Validates:
 * 1. Own temp stack + complete build + NO spare → captureTemp (auto-capture)
 * 2. Own temp stack + complete build + HAS spare → addToTemp (choice modal)
 * 3. Own temp stack + same rank + NO spare → captureTemp
 * 4. Own temp stack + same rank + HAS spare → addToTemp
 * 5. Not own temp stack → always addToTemp (no spare check)
 * 
 * Run: node __tests__/temp-stack-spare.test.js
 */

const TempStackDropHandler = require('../shared/game/smart-router/handlers/TempStackDropHandler');

let passed = 0;
let failed = 0;

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    }
  };
}

function createCard(rank, suit, value) {
  return { rank, suit, value };
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Temp Stack Spare Check Test Suite ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Complete Build Tests - NO spare → capture, HAS spare → addToTemp
// ─────────────────────────────────────────────────────────────────────────────

test('Own temp stack + complete build + NO spare → captureTemp', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9)] },  // Only one 9 - no spare
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'H', 5), createCard('4', 'S', 4)], value: 9, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('captureTemp');
});

test('Own temp stack + complete build + HAS spare → addToTemp', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9), createCard('9', 'S', 9)] },  // Two 9s - spare
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'H', 5), createCard('4', 'S', 4)], value: 9, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

test('Own temp stack + complete build + ZERO of that rank → addToTemp', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('7', 'H', 7), createCard('8', 'S', 8)] },  // No 9 in hand
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'H', 5), createCard('4', 'S', 4)], value: 9, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('7', 'H', 7), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Same Rank Tests - NO spare → capture, HAS spare → addToTemp
// ─────────────────────────────────────────────────────────────────────────────

test('Own temp stack + same rank + NO spare → captureTemp', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('5', 'H', 5)] },  // Only one 5
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'S', 5), createCard('5', 'D', 5)], value: 10, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('5', 'H', 5), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('captureTemp');
});

test('Own temp stack + same rank + HAS spare → addToTemp', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('5', 'H', 5), createCard('5', 'C', 5)] },  // Two 5s
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'S', 5), createCard('5', 'D', 5)], value: 10, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('5', 'H', 5), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Not Own Temp Stack Tests - always addToTemp (no spare check)
// ─────────────────────────────────────────────────────────────────────────────

test('Not own temp stack → always addToTemp (teammate)', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9)] },
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_2', owner: 2, cards: [createCard('5', 'H', 5), createCard('4', 'S', 4)], value: 9, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_2', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

test('Not own temp stack → always addToTemp (opponent)', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9)] },
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_1', owner: 1, cards: [createCard('5', 'H', 5), createCard('4', 'S', 4)], value: 9, need: 0 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_1', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Incomplete Build Tests - should addToTemp (no capture)
// ─────────────────────────────────────────────────────────────────────────────

test('Incomplete build → addToTemp (no capture)', () => {
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9)] },
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('5', 'H', 5), createCard('2', 'S', 2)], value: 7, need: 2 }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Multi-Build Tests (6+3=9 AND 7+2=9)
// ─────────────────────────────────────────────────────────────────────────────

test('Multi-build (6+3=9 AND 7+2=9) + NO spare → captureTemp', () => {
  // Temp stack: 6♦,3♦,7♥,2♣ - can form 6+3=9 OR 7+2=9
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9)] },  // Only one 9 - no spare
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [
        createCard('6', 'D', 6),
        createCard('3', 'D', 3),
        createCard('7', 'H', 7),
        createCard('2', 'C', 2)
      ], value: 9, need: 0, buildType: 'multi' }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('captureTemp');
});

test('Multi-build + HAS spare → addToTemp', () => {
  // Temp stack: 6♦,3♦,7♥,2♣ - can form 6+3=9 OR 7+2=9
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [createCard('9', 'H', 9), createCard('9', 'S', 9)] },  // Two 9s - spare
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [
        createCard('6', 'D', 6),
        createCard('3', 'D', 3),
        createCard('7', 'H', 7),
        createCard('2', 'C', 2)
      ], value: 9, need: 0, buildType: 'multi' }
    ]
  };
  
  const handler = new TempStackDropHandler();
  const result = handler.handle({ stackId: 'temp_0', card: createCard('9', 'H', 9), cardSource: 'hand' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Add from Table Source Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Add card from table to incomplete temp (table card)', () => {
  // Temp stack: 6♦,3♦ (incomplete, need 3)
  // Player drags A♦ from table - add to temp (no capture)
  const state = {
    gameMode: 'party',
    playerCount: 4,
    players: [
      { hand: [] },
      { hand: [] },
      { hand: [] },
      { hand: [] }
    ],
    tableCards: [
      { type: 'temp_stack', stackId: 'temp_0', owner: 0, cards: [createCard('6', 'D', 6), createCard('3', 'D', 3)], value: 9, need: 3 },
      { rank: 'A', suit: 'D', value: 1 }  // A♦ on table (loose card)
    ]
  };
  
  const handler = new TempStackDropHandler();
  // Card value (1) doesn't match need (3), and doesn't match build value (9)
  // Should return addToTemp (allow adding from table)
  const result = handler.handle({ stackId: 'temp_0', card: createCard('A', 'D', 1), cardSource: 'table' }, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}