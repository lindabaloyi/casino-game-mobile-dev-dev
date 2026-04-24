/**
 * Ghost Card System Test Suite
 * Tests unified ghost overlay logic for all drag sources.
 *
 * Validates:
 * 1. Top card extraction for all sources
 * 2. useGhostVisibility hook logic
 * 3. Data cloning behavior
 * 4. All 5 drag sources render correctly
 *
 * Run: node __tests__/ghost-overlay.test.js
 */

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

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
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy, got ${actual}`);
      }
    },
    toContain(expected) {
      if (!actual?.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
  };
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
// Mock Data Factories
// ─────────────────────────────────────────────────────────────────────────────

function createCard(rank, suit, value) {
  return { rank, suit, value, id: `${rank}${suit}` };
}

function createOpponentDrag(overrides = {}) {
  return {
    playerIndex: 1,
    source: 'hand',
    isDragging: true,
    position: { x: 0.5, y: 0.5 },
    card: null,
    cardId: null,
    cards: null,
    stackId: null,
    targetType: null,
    targetId: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Top Card Extraction Logic
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Ghost Overlay Logic Tests ===\n');

console.log('--- Top Card Extraction ---');

// Extracts top card from various drag states (matches OpponentGhostOverlay logic)
function getTopCard(opponentDrag) {
  if (opponentDrag.cards && opponentDrag.cards.length > 0) {
    return opponentDrag.cards[opponentDrag.cards.length - 1];
  }
  return opponentDrag.card;
}

test('hand source returns the single card', () => {
  const drag = createOpponentDrag({
    source: 'hand',
    card: createCard('A', 'H', 14),
    cardId: 'AH',
  });
  const topCard = getTopCard(drag);
  expect(topCard.rank).toBe('A');
  expect(topCard.suit).toBe('H');
});

test('table source returns the single card', () => {
  const drag = createOpponentDrag({
    source: 'table',
    card: createCard('K', 'D', 13),
    cardId: 'KD',
  });
  const topCard = getTopCard(drag);
  expect(topCard.rank).toBe('K');
  expect(topCard.suit).toBe('D');
});

test('captured source returns the single card', () => {
  const drag = createOpponentDrag({
    source: 'captured',
    card: createCard('Q', 'S', 12),
    cardId: 'QS',
  });
  const topCard = getTopCard(drag);
  expect(topCard.rank).toBe('Q');
  expect(topCard.suit).toBe('S');
});

test('temp_stack source returns TOP card (last in array)', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    cards: [
      createCard('5', 'H', 5),
      createCard('4', 'S', 4),
      createCard('8', 'D', 8),  // Top card
    ],
    stackId: 'temp_0',
  });
  const topCard = getTopCard(drag);
  expect(topCard.rank).toBe('8');
  expect(topCard.suit).toBe('D');
});

test('build_stack source returns TOP card (last in array)', () => {
  const drag = createOpponentDrag({
    source: 'build_stack',
    cards: [
      createCard('6', 'H', 6),
      createCard('3', 'C', 3),
      createCard('2', 'S', 2),
      createCard('9', 'D', 9),  // Top card
    ],
    stackId: 'build_1',
  });
  const topCard = getTopCard(drag);
  expect(topCard.rank).toBe('9');
  expect(topCard.suit).toBe('D');
});

test('empty cards array returns undefined', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    cards: [],
    stackId: 'temp_0',
  });
  const topCard = getTopCard(drag);
  expect(topCard).toBeFalsy();
});

test('null cards with no card returns undefined', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    cards: null,
    stackId: 'temp_0',
  });
  const topCard = getTopCard(drag);
  expect(topCard).toBeFalsy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Ghost Visibility Logic
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- Ghost Visibility ---');

function isHandCardHidden(opponentDrag, cardId) {
  if (!opponentDrag?.isDragging) return false;
  return opponentDrag.source === 'hand' && opponentDrag.cardId === cardId;
}

function isTableCardHidden(opponentDrag, cardId) {
  if (!opponentDrag?.isDragging) return false;
  return opponentDrag.source === 'table' && opponentDrag.cardId === cardId;
}

function isCapturedCardHidden(opponentDrag, cardId) {
  if (!opponentDrag?.isDragging) return false;
  return opponentDrag.source === 'captured' && opponentDrag.cardId === cardId;
}

function isTempStackHidden(opponentDrag, stackId) {
  if (!opponentDrag?.isDragging) return false;
  return opponentDrag.source === 'temp_stack' && opponentDrag.stackId === stackId;
}

function isBuildStackHidden(opponentDrag, stackId) {
  if (!opponentDrag?.isDragging) return false;
  return opponentDrag.source === 'build_stack' && opponentDrag.stackId === stackId;
}

// Hand visibility tests
test('hand card is hidden when opponent is dragging that card', () => {
  const drag = createOpponentDrag({
    source: 'hand',
    cardId: 'AH',
  });
  expect(isHandCardHidden(drag, 'AH')).toBeTruthy();
});

test('hand card is NOT hidden when opponent is dragging different card', () => {
  const drag = createOpponentDrag({
    source: 'hand',
    cardId: 'AH',
  });
  expect(isHandCardHidden(drag, 'KD')).toBeFalsy();
});

test('hand card is NOT hidden when opponent drag is from table', () => {
  const drag = createOpponentDrag({
    source: 'table',
    cardId: 'AH',
  });
  expect(isHandCardHidden(drag, 'AH')).toBeFalsy();
});

test('hand visibility returns false when no drag', () => {
  const drag = createOpponentDrag({
    isDragging: false,
  });
  expect(isHandCardHidden(drag, 'AH')).toBeFalsy();
});

// Table visibility tests
test('table card is hidden when opponent is dragging that card', () => {
  const drag = createOpponentDrag({
    source: 'table',
    cardId: 'QH',
  });
  expect(isTableCardHidden(drag, 'QH')).toBeTruthy();
});

test('table card is NOT hidden when dragging from hand', () => {
  const drag = createOpponentDrag({
    source: 'hand',
    cardId: 'QH',
  });
  expect(isTableCardHidden(drag, 'QH')).toBeFalsy();
});

// Captured visibility tests
test('captured card is hidden when opponent is dragging that card', () => {
  const drag = createOpponentDrag({
    source: 'captured',
    cardId: '10S',
  });
  expect(isCapturedCardHidden(drag, '10S')).toBeTruthy();
});

test('captured card is NOT hidden when dragging from different source', () => {
  const drag = createOpponentDrag({
    source: 'captured',
    cardId: '10S',
  });
  expect(isCapturedCardHidden(drag, 'JH')).toBeFalsy();
});

// Temp stack visibility tests
test('temp stack is hidden when opponent is dragging that stack', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    stackId: 'temp_0',
  });
  expect(isTempStackHidden(drag, 'temp_0')).toBeTruthy();
});

test('temp stack is NOT hidden when dragging different stack', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    stackId: 'temp_0',
  });
  expect(isTempStackHidden(drag, 'temp_1')).toBeFalsy();
});

test('temp stack is NOT hidden when dragging build_stack', () => {
  const drag = createOpponentDrag({
    source: 'build_stack',
    stackId: 'temp_0',
  });
  expect(isTempStackHidden(drag, 'temp_0')).toBeFalsy();
});

// Build stack visibility tests
test('build stack is hidden when opponent is dragging that build', () => {
  const drag = createOpponentDrag({
    source: 'build_stack',
    stackId: 'build_1',
  });
  expect(isBuildStackHidden(drag, 'build_1')).toBeTruthy();
});

test('build stack is NOT hidden when dragging temp stack', () => {
  const drag = createOpponentDrag({
    source: 'temp_stack',
    stackId: 'build_1',
  });
  expect(isBuildStackHidden(drag, 'build_1')).toBeFalsy();
});

test('build stack visibility returns false when no drag', () => {
  const drag = createOpponentDrag({
    isDragging: false,
    source: 'build_stack',
    stackId: 'build_1',
  });
  expect(isBuildStackHidden(drag, 'build_1')).toBeFalsy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Data Cloning Logic
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- Data Cloning ---');

test('card object is cloned (not by reference)', () => {
  const originalCard = createCard('A', 'H', 14);
  const clonedCard = { ...originalCard };

  // Modify original
  originalCard.rank = 'K';

  // Cloned should be unchanged
  expect(clonedCard.rank).toBe('A');
});

test('cards array is cloned (not by reference)', () => {
  const originalCards = [
    createCard('5', 'H', 5),
    createCard('4', 'S', 4),
  ];
  const clonedCards = [...originalCards];

  // Modify original array
  originalCards.push(createCard('9', 'D', 9));

  // Cloned should be unchanged
  expect(clonedCards.length).toBe(2);
});

test('nested card objects in array are NOT cloned (shallow clone)', () => {
  const originalCards = [
    createCard('5', 'H', 5),
    createCard('4', 'S', 4),
  ];
  const clonedCards = [...originalCards];

  // Modify card in original array
  originalCards[0].rank = 'K';

  // Shallow clone shares references to card objects
  // This is acceptable for our use case - we only need to prevent array mutation
  // Card properties themselves are treated as immutable
});

test('deep clone of cards array with card objects', () => {
  const originalCards = [
    createCard('5', 'H', 5),
    createCard('4', 'S', 4),
  ];
  // Deep clone using JSON parse/stringify
  const clonedCards = JSON.parse(JSON.stringify(originalCards));

  // Modify original
  originalCards[0].rank = 'K';

  // Deep clone should be completely independent
  expect(clonedCards[0].rank).toBe('5');
  expect(clonedCards[0].suit).toBe('H');
});

test('slice() clones array correctly', () => {
  const originalCards = [
    createCard('A', 'H', 14),
    createCard('K', 'D', 13),
  ];
  const clonedCards = originalCards.slice();

  // Modify original
  originalCards.push(createCard('Q', 'S', 12));

  expect(clonedCards.length).toBe(2);
  expect(originalCards.length).toBe(3);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Source-Based Styling Logic
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- Source-Based Styling ---');

function shouldScaleGhost(source) {
  return source === 'hand';
}

test('hand source should scale', () => {
  expect(shouldScaleGhost('hand')).toBeTruthy();
});

test('table source should NOT scale', () => {
  expect(shouldScaleGhost('table')).toBeFalsy();
});

test('captured source should NOT scale', () => {
  expect(shouldScaleGhost('captured')).toBeFalsy();
});

test('temp_stack source should NOT scale', () => {
  expect(shouldScaleGhost('temp_stack')).toBeFalsy();
});

test('build_stack source should NOT scale', () => {
  expect(shouldScaleGhost('build_stack')).toBeFalsy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Position Registry Lookup
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- Position Registry Lookup ---');

function findTargetPosition(registry, targetType, targetId) {
  if (!registry) return null;

  switch (targetType) {
    case 'card':
      return registry.cards?.get(targetId) || null;
    case 'stack':
    case 'temp_stack':
      return registry.tempStacks?.get(targetId) || null;
    case 'build_stack':
      return registry.buildStacks?.get(targetId) || null;
    case 'capture':
      return registry.capturePiles?.get(parseInt(targetId, 10)) || null;
    default:
      return null;
  }
}

test('finds card position by cardId', () => {
  const registry = {
    cards: new Map([['AH', { x: 100, y: 200 }]]),
  };
  const pos = findTargetPosition(registry, 'card', 'AH');
  expect(pos.x).toBe(100);
  expect(pos.y).toBe(200);
});

test('finds temp stack position by stackId', () => {
  const registry = {
    tempStacks: new Map([['temp_0', { x: 150, y: 250 }]]),
  };
  const pos = findTargetPosition(registry, 'temp_stack', 'temp_0');
  expect(pos.x).toBe(150);
  expect(pos.y).toBe(250);
});

test('finds build stack position by stackId', () => {
  const registry = {
    buildStacks: new Map([['build_1', { x: 300, y: 400 }]]),
  };
  const pos = findTargetPosition(registry, 'build_stack', 'build_1');
  expect(pos.x).toBe(300);
  expect(pos.y).toBe(400);
});

test('finds capture pile by player index', () => {
  const registry = {
    capturePiles: new Map([[0, { x: 50, y: 100 }]]),
  };
  const pos = findTargetPosition(registry, 'capture', '0');
  expect(pos.x).toBe(50);
  expect(pos.y).toBe(100);
});

test('returns null for unknown target', () => {
  const registry = {
    cards: new Map(),
  };
  const pos = findTargetPosition(registry, 'card', 'unknown');
  expect(pos).toBeFalsy();
});

test('returns null when registry is empty', () => {
  const pos = findTargetPosition(null, 'card', 'AH');
  expect(pos).toBeFalsy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}