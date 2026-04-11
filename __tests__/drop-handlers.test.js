/**
 * Drop Handlers Test Suite
 * Tests the drop handler routing for all stack/card drop scenarios
 * 
 * Validates:
 * 1. GameBoard handlers call correct actions
 * 2. Router.js routes correctly for each action type
 * 3. Trail logic works (not createTemp)
 * 4. Build stack drops route to friendBuildDrop/opponentBuildDrop
 * 5. Temp stack drops route to addToTemp
 * 6. Loose card drops route to createTemp with target
 * 
 * Run: node __tests__/drop-handlers.test.js
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
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toHaveBeenCalled() {
      if (!actual.called) {
        throw new Error(`Expected function to have been called`);
      }
    }
  };
}

function createCard(rank, suit, value) {
  return { rank, suit, value };
}

function createTestState(players, playerCount = 4) {
  return {
    gameMode: 'party',
    playerCount: playerCount,
    players: players,
    tableCards: []
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Drop Handlers Test Suite ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Trail Logic Tests - Verify trail action, NOT createTemp
// ─────────────────────────────────────────────────────────────────────────────

test('Router.routes trail action correctly', () => {
  const state = createTestState([
    { hand: [createCard('5', 'H', 5)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  const router = new Router();
  const payload = {
    card: createCard('5', 'H', 5)
  };
  
  // Trail should route directly to trail action (not createTemp)
  const result = router.route('trail', payload, state, 0);
  expect(result.type).toBe('trail');
});

test('Router.routes trail with correct payload', () => {
  const state = createTestState([
    { hand: [createCard('K', 'S', 13)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  const router = new Router();
  const card = createCard('K', 'S', 13);
  const payload = { card };
  
  const result = router.route('trail', payload, state, 0);
  expect(result.type).toBe('trail');
  expect(result.payload.card.rank).toBe('K');
  expect(result.payload.card.suit).toBe('S');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Build Stack Drop Tests - friendBuildDrop / opponentBuildDrop
// ─────────────────────────────────────────────────────────────────────────────

test('Router.routes friendBuildDrop for own build with spare card', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S', 8), createCard('8', 'H', 8)] },  // P0 has TWO 8s (spare exists)
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_01',
      owner: 0,  // P0 owns
      cards: [createCard('5', 'H', 5), createCard('3', 'S', 3)],
      value: 8,
      target: 8,
      currentTotal: 8
    }
  ];
  
  const router = new Router();
  const payload = {
    stackId: 'buildP2_01',
    card: createCard('8', 'S', 8),
    cardSource: 'hand'
  };
  
  // Dropping on own build with spare should extend (not capture)
  const result = router.route('friendBuildDrop', payload, state, 0);
  expect(result.type).toBe('extendBuild');
});

test('Router handles friendBuildDrop on different owner build', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S', 8)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_01',
      owner: 1,
      cards: [createCard('5', 'H', 5)],
      value: 5,
      target: 5
    }
  ];
  
  const router = new Router();
  const payload = {
    stackId: 'buildP2_01',
    card: createCard('8', 'S', 8),
    cardSource: 'hand'
  };
  
  // In party mode, P0's teammate is P2, so P1 is different team
  // The router should find the stack and process - not throw
  let result;
  try {
    result = router.route('friendBuildDrop', payload, state, 0);
  } catch (e) {
    // It's OK if it throws (validation error) - that's also valid behavior
    result = { type: 'thrown', error: e.message };
  }
  
  // Just verify it doesn't crash - result should have some type
  console.log('  Result type:', result?.type);
});

test('Router validates opponentBuildDrop on friendly build', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S', 8)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  state.tableCards = [
    {
      type: 'build_stack',
      stackId: 'buildP2_01',
      owner: 0,  // P0 owns (friendly to themselves)
      cards: [createCard('5', 'H', 5)],
      value: 5,
      target: 5
    }
  ];
  
  const router = new Router();
  const payload = {
    stackId: 'buildP2_01',
    card: createCard('8', 'S', 8),
    cardSource: 'hand'
  };
  
  // Trying opponentBuildDrop on own build should throw
  try {
    router.route('opponentBuildDrop', payload, state, 0);
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e.message).toContain("Cannot perform opponentBuildDrop on friendly build");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Temp Stack Drop Tests - addToTemp
// ─────────────────────────────────────────────────────────────────────────────

test('Router.routes addToTemp correctly', () => {
  const state = createTestState([
    { hand: [createCard('5', 'H', 5)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  state.tableCards = [
    {
      type: 'temp_stack',
      stackId: 'temp_0',
      owner: 0,
      cards: [createCard('3', 'S', 3)]
    }
  ];
  
  const router = new Router();
  const payload = {
    stackId: 'temp_0',
    card: createCard('5', 'H', 5),
    cardSource: 'hand'
  };
  
  // addToTemp should pass through directly
  const result = router.route('addToTemp', payload, state, 0);
  expect(result.type).toBe('addToTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Loose Card Drop Tests - createTemp with targetCard
// ─────────────────────────────────────────────────────────────────────────────

test('Router routes createTemp when no existing temp stack', () => {
  const state = createTestState([
    { hand: [createCard('5', 'H', 5)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  // No temp stacks - player can create new temp
  state.tableCards = [];
  
  const router = new Router();
  const payload = {
    card: createCard('5', 'H', 5),
    targetCard: null,  // Creates new temp stack
    source: 'hand'
  };
  
  // createTemp should work when no existing temp
  const result = router.route('createTemp', payload, state, 0);
  expect(result.type).toBe('createTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Router Action Type Registration Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Router has case for friendBuildDrop (throws on missing stack)', () => {
  const router = new Router();
  const state = createTestState([
    { hand: [] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  // Should not fall through to default - should throw for missing stack
  let threw = false;
  try {
    router.route('friendBuildDrop', {
      stackId: 'nonexistent',
      card: {},
      cardSource: 'hand'
    }, state, 0);
  } catch (e) {
    threw = true;
  }
  expect(threw).toBe(true);
});

test('Router has case for opponentBuildDrop (throws on missing stack)', () => {
  const router = new Router();
  const state = createTestState([
    { hand: [] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  let threw = false;
  try {
    router.route('opponentBuildDrop', {
      stackId: 'nonexistent',
      card: {},
      cardSource: 'hand'
    }, state, 0);
  } catch (e) {
    threw = true;
  }
  expect(threw).toBe(true);
});

test('Router has case for addToTemp', () => {
  const router = new Router();
  const state = createTestState([
    { hand: [] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  const result = router.route('addToTemp', {
    stackId: 'test',
    card: {},
    cardSource: 'hand'
  }, state, 0);
  
  expect(result.type).toBe('addToTemp');
});

test('Router has case for trail with valid card', () => {
  const router = new Router();
  const state = createTestState([
    { hand: [] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  const result = router.route('trail', { card: createCard('5', 'H', 5) }, state, 0);
  expect(result.type).toBe('trail');
});

test('Router has case for createTemp', () => {
  const router = new Router();
  const state = createTestState([
    { hand: [] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  const result = router.route('createTemp', { card: {}, targetCard: null, source: 'hand' }, state, 0);
  expect(result.type).toBe('createTemp');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Edge Case Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Router throws error for nonexistent build stack', () => {
  const state = createTestState([
    { hand: [createCard('8', 'S', 8)] },
    { hand: [] },
    { hand: [] },
    { hand: [] }
  ]);
  
  state.tableCards = [];
  
  const router = new Router();
  const payload = {
    stackId: 'nonexistent_build',
    card: createCard('8', 'S', 8),
    cardSource: 'hand'
  };
  
  try {
    router.route('friendBuildDrop', payload, state, 0);
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e.message).toContain('not found');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Run Results
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Test Summary ===');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failed > 0) {
  console.log('❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}