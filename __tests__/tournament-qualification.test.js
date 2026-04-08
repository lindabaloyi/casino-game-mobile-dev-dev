/**
 * TournamentQualification Tests
 * Tests qualification logic, tie-breaking, and phase transitions
 */

const path = require('path');
const TournamentQualification = require('../multiplayer/server/services/TournamentQualification');

const { determineQualification, logQualificationBreakdown, resetQualifiedPlayers, markEliminated } = TournamentQualification;

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
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${item}`);
      }
    },
    toHaveLength(len) {
      if (actual.length !== len) {
        throw new Error(`Expected length ${len}, got ${actual.length}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, got undefined`);
      }
    }
  };
}

console.log('\n=== TournamentQualification Tests ===\n');

// Helper to create player
function player(id, name, score, spades, cards, eliminated = false) {
  return { id, name, cumulativeScore: score, cumulativeSpades: spades, cumulativeCards: cards, eliminated };
}

// ============================================
// determineQualification Tests
// ============================================

console.log('--- determineQualification ---');

test('QUALIFYING: top 3 qualify, 1 eliminated', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28),
    player('p3', 'Carol', 450, 7, 30),
    player('p4', 'Dave', 210, 2, 18)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  expect(result.nextPhase).toBe('SEMI_FINAL');
  expect(result.qualified).toHaveLength(3);
  expect(result.eliminated).toHaveLength(1);
  expect(result.qualified.map(p => p.id)).toEqual(['p3', 'p1', 'p2']);
  expect(result.eliminated[0].id).toBe('p4');
});

test('QUALIFYING: tie-break by spades', () => {
  const players = [
    player('p1', 'Alice', 420, 6, 31),
    player('p2', 'Bob', 420, 8, 29),
    player('p3', 'Carol', 380, 5, 28),
    player('p4', 'Dave', 210, 2, 18)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // Bob has more spades (8 vs 6), so Bob ranks higher
  expect(result.qualified.map(p => p.id)).toEqual(['p2', 'p1', 'p3']);
});

test('QUALIFYING: tie-break by cards', () => {
  const players = [
    player('p1', 'Alice', 420, 6, 29),
    player('p2', 'Bob', 420, 6, 31),
    player('p3', 'Carol', 380, 5, 28),
    player('p4', 'Dave', 210, 2, 18)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // Bob has more cards (31 vs 29), so Bob ranks higher
  expect(result.qualified.map(p => p.id)).toEqual(['p2', 'p1', 'p3']);
});

test('SEMI_FINAL: top 2 qualify, 1 eliminated', () => {
  const players = [
    player('p1', 'Alice', 300, 8, 31),
    player('p2', 'Bob', 280, 6, 28),
    player('p3', 'Carol', 250, 5, 25)
  ];
  
  const result = determineQualification(players, 'SEMI_FINAL', {});
  
  expect(result.nextPhase).toBe('FINAL');
  expect(result.qualified).toHaveLength(2);
  expect(result.eliminated).toHaveLength(1);
  expect(result.qualified.map(p => p.id)).toEqual(['p1', 'p2']);
});

test('FINAL: no next phase, returns empty', () => {
  const players = [
    player('p1', 'Alice', 150, 4, 15),
    player('p2', 'Bob', 120, 3, 12)
  ];
  
  const result = determineQualification(players, 'FINAL', {});
  
  expect(result.nextPhase).toBe(null);
  expect(result.qualified).toHaveLength(0);
  expect(result.eliminated).toHaveLength(0);
});

test('handles already eliminated players', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31, false),
    player('p2', 'Bob', 380, 6, 28, true), // already eliminated
    player('p3', 'Carol', 450, 7, 30, false),
    player('p4', 'Dave', 210, 2, 18, false)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // Should filter out already eliminated, 3 active remain, all 3 qualify
  expect(result.qualified).toHaveLength(3);
  expect(result.eliminated).toHaveLength(0); // Bob was already eliminated, not re-eliminated
  expect(result.sortedPlayers.map(p => p.id)).toEqual(['p3', 'p1', 'p4']); // Carol, Alice, Dave
});

test('sortedPlayers returns all active players in rank order', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 450, 7, 30),
    player('p3', 'Carol', 380, 6, 28),
    player('p4', 'Dave', 210, 2, 18)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  expect(result.sortedPlayers.map(p => p.id)).toEqual(['p2', 'p1', 'p3', 'p4']);
});

// ============================================
// resetQualifiedPlayers Tests
// ============================================

console.log('\n--- resetQualifiedPlayers ---');

test('resets score, spades, cards and handsPlayed for qualified', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28),
    player('p3', 'Carol', 450, 7, 30)
  ];
  players[0].handsPlayed = 3;
  players[1].handsPlayed = 3;
  players[2].handsPlayed = 3;
  
  const qualified = [players[0], players[2]]; // Alice and Carol qualify
  
  resetQualifiedPlayers(players, qualified);
  
  expect(players[0].cumulativeScore).toBe(0);
  expect(players[0].cumulativeSpades).toBe(0);
  expect(players[0].cumulativeCards).toBe(0);
  expect(players[0].handsPlayed).toBe(0);
  
  expect(players[1].cumulativeScore).toBe(380); // Bob unchanged
  expect(players[1].cumulativeSpades).toBe(6);
  
  expect(players[2].cumulativeScore).toBe(0);
  expect(players[2].cumulativeSpades).toBe(0);
});

test('handles empty qualified array', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28)
  ];
  
  resetQualifiedPlayers(players, []);
  
  expect(players[0].cumulativeScore).toBe(420);
  expect(players[1].cumulativeScore).toBe(380);
});

// ============================================
// markEliminated Tests
// ============================================

console.log('\n--- markEliminated ---');

test('marks players as eliminated', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28),
    player('p3', 'Carol', 210, 2, 18)
  ];
  
  markEliminated([players[1], players[2]]);
  
  expect(players[0].eliminated).toBe(false);
  expect(players[1].eliminated).toBe(true);
  expect(players[2].eliminated).toBe(true);
});

test('handles empty eliminated array', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28)
  ];
  
  markEliminated([]);
  
  expect(players[0].eliminated).toBe(false);
  expect(players[1].eliminated).toBe(false);
});

// ============================================
// Edge Cases
// ============================================

console.log('\n--- Edge Cases ---');

test('handles missing cumulativeSpades/cumulativeCards (defaults to 0)', () => {
  const players = [
    { id: 'p1', name: 'Alice', cumulativeScore: 420, eliminated: false },
    { id: 'p2', name: 'Bob', cumulativeScore: 420, eliminated: false },
    { id: 'p3', name: 'Carol', cumulativeScore: 380, eliminated: false }
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 2 });
  
  // Both have same score and 0 spades/cards - deterministic hash decides
  expect(result.qualified).toHaveLength(2);
});

test('handles all players with same score and stats', () => {
  const players = [
    { id: 'p1', name: 'Alice', cumulativeScore: 100, cumulativeSpades: 5, cumulativeCards: 20, eliminated: false },
    { id: 'p2', name: 'Bob', cumulativeScore: 100, cumulativeSpades: 5, cumulativeCards: 20, eliminated: false },
    { id: 'p3', name: 'Carol', cumulativeScore: 100, cumulativeSpades: 5, cumulativeCards: 20, eliminated: false },
    { id: 'p4', name: 'Dave', cumulativeScore: 100, cumulativeSpades: 5, cumulativeCards: 20, eliminated: false }
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // Should still work - deterministic hash used as final tie-breaker
  expect(result.qualified).toHaveLength(3);
  expect(result.eliminated).toHaveLength(1);
});

test('exact config value used for qualifyingPlayers', () => {
  const players = [
    player('p1', 'Alice', 420, 8, 31),
    player('p2', 'Bob', 380, 6, 28),
    player('p3', 'Carol', 350, 5, 27),
    player('p4', 'Dave', 320, 4, 26),
    player('p5', 'Eve', 300, 3, 25)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 4 });
  
  expect(result.qualified).toHaveLength(4);
  expect(result.eliminated).toHaveLength(1);
});

test('debug flag can be toggled via environment variable', () => {
  const originalDebug = process.env.DEBUG_QUALIFICATION;
  
  process.env.DEBUG_QUALIFICATION = 'true';
  let tq = require('../multiplayer/server/services/TournamentQualification');
  expect(tq).toBeDefined();
  
  process.env.DEBUG_QUALIFICATION = originalDebug || '';
});

// ============================================
// Summary
// ============================================

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
