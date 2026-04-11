/**
 * Friendly Build Routing Tests
 * Tests routing decisions for teammate build extensions
 * 
 * Scenario: Team A P1 has build 8 (sum/diff), Team A P2 tries to extend with 8♠ (no spare)
 * Expected: route to extendBuild, NOT captureOwn
 */

const Router = require('../shared/game/smart-router/Router');

let passed = 0;
let failed = 0;

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

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    }
  };
}

function createCard(rank, suit) {
  const rankValues = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
  };
  return { rank, suit, value: rankValues[rank] || 0 };
}

function createTestState(players) {
  return {
    gameMode: 'party',
    players: players,
    tableCards: []
  };
}

// Test 1: P2 extends P1's sum/diff build (value 8) with 8♠, no spare
test('P2 extends P1 sum/diff build (no spare) → extendBuild', () => {
  const state = createTestState([
    { hand: [createCard('5', 'H'), createCard('3', 'S'), createCard('4', 'H'), createCard('3', 'C'), createCard('A', 'H'), createCard('8', 'D')] }, // P0 (P1) - owner of build
    { hand: [createCard('8', 'S'), createCard('9', 'H'), createCard('J', 'D')] }, // P1 (P2) - trying to extend
    { hand: [] },
    { hand: [] }
  ]);
  
  // P0's build: 5♥+3♠+4♥+3♣+A♥+8♦ = 24, target value = 8
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_01',
      owner: 0,  // P0 (Team A P1)
      cards: [
        createCard('5', 'H'), createCard('3', 'S'), createCard('4', 'H'),
        createCard('3', 'C'), createCard('A', 'H'), createCard('8', 'D')
      ],
      value: 8,
      target: 8,
      currentTotal: 24
    }
  ];

  const router = new Router();
  const payload = {
    stackId: 'buildP2_01',
    card: createCard('8', 'S'),
    cardSource: 'hand'
  };

  // P1 (playerIndex 1) tries to extend P0's build with 8♠
  const result = router.route('friendBuildDrop', payload, state, 1);

  console.log('  Result:', result.type);
  expect(result.type).toBe('extendBuild');
});

// Test 2: P2 extends P1's same-rank build with matching rank, no spare
test('P2 extends P1 same-rank build (no spare) → extendBuild', () => {
  const state = createTestState([
    { hand: [createCard('8', 'H'), createCard('8', 'D'), createCard('9', 'S')] }, // P0 (P1) - owner of build
    { hand: [createCard('8', 'S'), createCard('J', 'D')] }, // P1 (P2) - trying to extend
    { hand: [] },
    { hand: [] }
  ]);

  // P0's same-rank build: 8♥+8♦ = value 8, same rank (8)
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_02',
      owner: 0,  // P0 (Team A P1)
      cards: [createCard('8', 'H'), createCard('8', 'D')],
      value: 8,
      target: 8,
      currentTotal: 16
    }
  ];

  const router = new Router();
  const payload = {
    stackId: 'buildP2_02',
    card: createCard('8', 'S'),
    cardSource: 'hand'
  };

  // P1 (playerIndex 1) tries to extend P0's same-rank build with 8♠
  const result = router.route('friendBuildDrop', payload, state, 1);

  console.log('  Result:', result.type);
  expect(result.type).toBe('extendBuild');
});

// Test 3: P1 extends own sum/diff build (no spare) → should capture
test('P1 extends own sum/diff build (no spare) → captureOwn', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S'), createCard('5', 'H'), createCard('3', 'S')] }, // P0 - trying to extend
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);

  // P0's build: 5♥+3♠ = 8, target value = 8
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_03',
      owner: 0,  // P0 owns the build
      cards: [createCard('5', 'H'), createCard('3', 'S')],
      value: 8,
      target: 8,
      currentTotal: 8
    }
  ];

  const router = new Router();
  const payload = {
    stackId: 'buildP2_03',
    card: createCard('8', 'S'),
    cardSource: 'hand'
  };

  // P0 tries to extend own build with 8♠ (no spare - only one 8 in hand)
  const result = router.route('friendBuildDrop', payload, state, 0);

  console.log('  Result:', result.type);
  expect(result.type).toBe('captureOwn');
});

// Test 4: P2 extends P1's build with card value LESS than target → extendBuild
test('P2 extends P1 build with lower card → extendBuild', () => {
  const state = createTestState([
    { hand: [createCard('5', 'H'), createCard('3', 'S'), createCard('K', 'D')] }, // P0 (P1) - owner
    { hand: [createCard('3', 'C'), createCard('7', 'H')] }, // P1 (P2) - trying to extend with 3♣ (value 3 < target 8)
    { hand: [] },
    { hand: [] }
  ]);

  // P0's build: 5♥+3♠ = 8, target value = 8
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_04',
      owner: 0,
      cards: [createCard('5', 'H'), createCard('3', 'S')],
      value: 8,
      target: 8,
      currentTotal: 8
    }
  ];

  const router = new Router();
  const payload = {
    stackId: 'buildP2_04',
    card: createCard('3', 'C'),
    cardSource: 'hand'
  };

  // P1 (playerIndex 1) extends with 3♣ (value 3 < target 8)
  const result = router.route('friendBuildDrop', payload, state, 1);

  console.log('  Result:', result.type);
  expect(result.type).toBe('extendBuild');
});

// Test 5: P1 extends own build WITH spare → should extendBuild
test('P1 extends own build (has spare) → extendBuild', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S'), createCard('8', 'H'), createCard('5', 'D')] }, // P0 has TWO 8s (spare exists)
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);

  // P0's build: 5♥+3♠ = 8
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_05',
      owner: 0,
      cards: [createCard('5', 'H'), createCard('3', 'S')],
      value: 8,
      target: 8,
      currentTotal: 8
    }
  ];

  const router = new Router();
  const payload = {
    stackId: 'buildP2_05',
    card: createCard('8', 'S'),
    cardSource: 'hand'
  };

  // P0 extends own build with 8♠ (has spare 8♥)
  const result = router.route('friendBuildDrop', payload, state, 0);

  console.log('  Result:', result.type);
  expect(result.type).toBe('extendBuild');
});

// Run tests
console.log('\n=== Friendly Build Routing Tests ===\n');
console.log(`Test: P2 extends P1's sum/diff build (no spare) → extendBuild`);
console.log(`Test: P2 extends P1's same-rank build (no spare) → extendBuild`);
console.log(`Test: P1 extends own sum/diff build (no spare) → captureOwn`);
console.log(`Test: P2 extends P1's build with lower card → extendBuild`);
console.log(`Test: P1 extends own build (has spare) → extendBuild`);

console.log('\n=== Results ===\n');
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}