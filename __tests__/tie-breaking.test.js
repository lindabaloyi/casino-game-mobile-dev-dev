/**
 * Tie-Breaking Tests
 * Tests unified tie-breaking across all game modes
 */

const path = require('path');
const scoringPath = path.join(__dirname, '../multiplayer/server/game/scoring');
const { rankPlayers, getWinnerIndex, getRankings, deterministicHash } = require(scoringPath);

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
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    not: {
      toBe(expected) {
        if (actual === expected) {
          throw new Error(`Expected not ${expected}, but got ${actual}`);
        }
      }
    }
  };
}

console.log('\n=== Tie-Breaking Tests ===\n');

describe = test;
it = test;

// Test deterministicHash
test('deterministicHash - same string produces same hash', () => {
  expect(deterministicHash('test')).toBe(deterministicHash('test'));
});

test('deterministicHash - different strings produce different hashes', () => {
  expect(deterministicHash('player1')).not.toBe(deterministicHash('player2'));
});

// Test rankPlayers
test('rankPlayers - higher score wins', () => {
  const scores = [7, 3];
  const result = rankPlayers(['p0', 'p1'], scores, []);
  expect(result).toEqual([0, 1]);
});

test('rankPlayers - tie-break by spades', () => {
  const scores = [5, 5];
  const breakdowns = [
    { spadeCount: 4, totalCards: 20, cards: [] },
    { spadeCount: 6, totalCards: 20, cards: [] }
  ];
  const result = rankPlayers(['p0', 'p1'], scores, breakdowns);
  expect(result).toEqual([1, 0]); // Player 1 wins (more spades)
});

test('rankPlayers - tie-break by card count', () => {
  const scores = [5, 5];
  const breakdowns = [
    { spadeCount: 4, totalCards: 20, cards: [] },
    { spadeCount: 4, totalCards: 22, cards: [] }
  ];
  const result = rankPlayers(['p0', 'p1'], scores, breakdowns);
  expect(result).toEqual([1, 0]); // Player 1 wins (more cards)
});

test('rankPlayers - 3-player ties', () => {
  const scores = [5, 5, 5];
  const breakdowns = [
    { spadeCount: 3, totalCards: 20, cards: [] },
    { spadeCount: 5, totalCards: 20, cards: [] },
    { spadeCount: 4, totalCards: 20, cards: [] }
  ];
  const result = rankPlayers(['p0', 'p1', 'p2'], scores, breakdowns);
  expect(result).toEqual([1, 2, 0]); // p1 > p2 > p0
});

test('rankPlayers - 4-player free-for-all', () => {
  const scores = [3, 7, 5, 5];
  const breakdowns = [
    { spadeCount: 2, totalCards: 15, cards: [] },
    { spadeCount: 4, totalCards: 18, cards: [] },
    { spadeCount: 6, totalCards: 20, cards: [] },
    { spadeCount: 6, totalCards: 22, cards: [] }
  ];
  const result = rankPlayers(['p0', 'p1', 'p2', 'p3'], scores, breakdowns);
  // p1 wins (7), p3 second (5,6 spades,22 cards), p2 third (5,6 spades,20 cards), p0 last
  expect(result).toEqual([1, 3, 2, 0]);
});

// Test getWinnerIndex
test('getWinnerIndex - 2-player winner', () => {
  const gameState = {
    scores: [7, 3],
    scoreBreakdowns: [],
    players: [{ id: 'p0' }, { id: 'p1' }]
  };
  expect(getWinnerIndex(gameState)).toBe(0);
});

test('getWinnerIndex - tie-breaker used', () => {
  const gameState = {
    scores: [5, 5],
    scoreBreakdowns: [
      { spadeCount: 4, totalCards: 20, cards: [] },
      { spadeCount: 6, totalCards: 20, cards: [] }
    ],
    players: [{ id: 'p0' }, { id: 'p1' }]
  };
  expect(getWinnerIndex(gameState)).toBe(1);
});

// Test getRankings
test('getRankings - full ranking', () => {
  const gameState = {
    scores: [3, 7, 5, 5],
    scoreBreakdowns: [
      { spadeCount: 2, totalCards: 15, cards: [] },
      { spadeCount: 4, totalCards: 18, cards: [] },
      { spadeCount: 6, totalCards: 20, cards: [] },
      { spadeCount: 6, totalCards: 22, cards: [] }
    ],
    players: [{ id: 'p0' }, { id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
  };
  const rankings = getRankings(gameState);
  // p1 wins (7), p3 second (5,6 spades,22 cards), p2 third, p0 last
  expect(rankings).toEqual([1, 3, 2, 0]);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
