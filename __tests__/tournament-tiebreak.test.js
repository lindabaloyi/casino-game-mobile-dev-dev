/**
 * Tournament Tie-Break Test Script
 * Tests winner selection and elimination logic with forced scores
 * 
 * Run: node __tests__/tournament-tiebreak.test.js
 */

// Load modules
const { rankPlayers, getRankings, getWinnerIndex } = require('../shared/game/scoring.js');
const { determineQualification } = require('../multiplayer/server/services/TournamentQualification');

console.log('\n' + '='.repeat(60));
console.log('🏆 TOURNAMENT TIE-BREAK TEST SUITE');
console.log('='.repeat(60) + '\n');

// Test helper
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, msg) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${msg}: expected ${expectedStr}, got ${actualStr}`);
  }
}

// ============================================================
// TEST 1: Winner Selection with Tie-Break
// ============================================================
console.log('\n📋 Test 1: Winner Selection (tie-break on spades)');
console.log('-'.repeat(50));

test('P2 wins when tied on score but has more spades', () => {
  // Game state: 4 players, P0 and P2 both score 10, but P2 has more spades
  const gameState = {
    players: [
      { userId: 'player_0' },
      { userId: 'player_1' },
      { userId: 'player_2' },
      { userId: 'player_3' }
    ],
    scores: [10, 5, 10, 3],
    scoreBreakdowns: [
      { spadeCount: 2, totalCards: 10 }, // P0: 10 score, 2 spades
      { spadeCount: 1, totalCards: 5 },  // P1: 5 score, 1 spade
      { spadeCount: 4, totalCards: 12 }, // P2: 10 score (tied), 4 spades (wins)
      { spadeCount: 0, totalCards: 3 }   // P3: 3 score
    ]
  };
  
  const winnerIndex = getWinnerIndex(gameState);
  assertEqual(winnerIndex, 2, 'Winner should be P2');
});

test('P1 wins when tied on score and spades but has more cards', () => {
  const gameState = {
    players: [
      { userId: 'player_0' },
      { userId: 'player_1' },
      { userId: 'player_2' },
      { userId: 'player_3' }
    ],
    scores: [10, 10, 10, 5],
    scoreBreakdowns: [
      { spadeCount: 3, totalCards: 8 },  // P0: 10, 3 spades, 8 cards
      { spadeCount: 3, totalCards: 12 }, // P1: 10, 3 spades (tied), 12 cards (wins!)
      { spadeCount: 3, totalCards: 10 }, // P2: 10, 3 spades, 10 cards
      { spadeCount: 1, totalCards: 5 }   // P3: 5
    ]
  };
  
  const winnerIndex = getWinnerIndex(gameState);
  assertEqual(winnerIndex, 1, 'Winner should be P1 with most cards');
});

test('getRankings returns all players in rank order', () => {
  const gameState = {
    players: [
      { userId: 'player_0' },
      { userId: 'player_1' },
      { userId: 'player_2' },
      { userId: 'player_3' }
    ],
    scores: [5, 10, 10, 3],
    scoreBreakdowns: [
      { spadeCount: 1, totalCards: 5 },  // P0: 5
      { spadeCount: 3, totalCards: 10 }, // P1: 10 (wins)
      { spadeCount: 2, totalCards: 12 }, // P2: 10 (2nd)
      { spadeCount: 0, totalCards: 3 }   // P3: 3
    ]
  };
  
  const rankings = getRankings(gameState);
  assertDeepEqual(rankings, [1, 2, 0, 3], 'Rank order should be P1, P2, P0, P3');
});

// ============================================================
// TEST 2: Elimination (lowest ranked player)
// ============================================================
console.log('\n📋 Test 2: Elimination Logic');
console.log('-'.repeat(50));

test('Lowest ranked player eliminated', () => {
  // 4 players, qualifying phase (need 3)
  const players = [
    { id: 'player_0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 },
    { id: 'player_1', cumulativeScore: 5, cumulativeSpades: 1, cumulativeCards: 5 },
    { id: 'player_2', cumulativeScore: 10, cumulativeSpades: 4, cumulativeCards: 12 },
    { id: 'player_3', cumulativeScore: 3, cumulativeSpades: 0, cumulativeCards: 3 }
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // P3 should be eliminated (lowest score)
  assertEqual(result.eliminated.length, 1, 'One player eliminated');
  assertEqual(result.eliminated[0].id, 'player_3', 'player_3 eliminated');
  
  // P0, P1, P2 should qualify
  assertEqual(result.qualified.length, 3, 'Three qualify');
});

test('Tie-break eliminates correct player when scores tied', () => {
  // P1 and P2 both at 5 score, but P1 has fewer spades
  // P0 is safe with 10, P3 is safe with 6 (just above 5), so P1 should be eliminated
  const players = [
    { id: 'player_0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 }, // Qualifies (top 3)
    { id: 'player_1', cumulativeScore: 5, cumulativeSpades: 2, cumulativeCards: 5 },   // Tied at 5, lower spades
    { id: 'player_2', cumulativeScore: 5, cumulativeSpades: 4, cumulativeCards: 12 }, // Tied at 5, higher spades!
    { id: 'player_3', cumulativeScore: 6, cumulativeSpades: 1, cumulativeCards: 8 }   // Qualifies (just above 5)
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // player_1 should be eliminated (tied at 5, but lower spades than player_2)
  assertEqual(result.eliminated[0].id, 'player_1', 'player_1 eliminated (lower spades in tie)');
});

test('Phase transitions correctly', () => {
  const players = [
    { id: 'player_0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 },
    { id: 'player_1', cumulativeScore: 5, cumulativeSpades: 1, cumulativeCards: 5 },
    { id: 'player_2', cumulativeScore: 3, cumulativeSpades: 0, cumulativeCards: 3 }
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  assertEqual(result.nextPhase, 'SEMI_FINAL', 'Should transition to SEMI_FINAL');
});

test('Semi-final to FINAL transition', () => {
  const players = [
    { id: 'player_0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 },
    { id: 'player_1', cumulativeScore: 5, cumulativeSpades: 1, cumulativeCards: 5 }
  ];
  
  const result = determineQualification(players, 'SEMI_FINAL', { semifinalPlayers: 2 });
  
  assertEqual(result.nextPhase, 'FINAL', 'Should transition to FINAL');
});

// ============================================================
// TEST 3: Full Tournament Flow
// ============================================================
console.log('\n📋 Test 3: Full Tournament Flow Simulation');
console.log('-'.repeat(50));

test('QUALIFYING → SEMI_FINAL → FINAL flow', () => {
  // Hand 1: Scores
  let players = [
    { id: 'p0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 },
    { id: 'p1', cumulativeScore: 5, cumulativeSpades: 1, cumulativeCards: 5 },
    { id: 'p2', cumulativeScore: 8, cumulativeSpades: 2, cumulativeCards: 8 },
    { id: 'p3', cumulativeScore: 3, cumulativeSpades: 0, cumulativeCards: 3 }
  ];
  
  // Qualifying round - eliminate lowest (p3)
  let result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  assertEqual(result.eliminated[0].id, 'p3', 'p3 eliminated in qualifying');
  assertEqual(result.nextPhase, 'SEMI_FINAL', 'Next phase is SEMI_FINAL');
  
  // Hand 2 would be SEMI_FINAL with 3 players
  // Simulate new scores (reset for next phase)
  players = [
    { id: 'p0', cumulativeScore: 0, cumulativeSpades: 0, cumulativeCards: 0 },
    { id: 'p1', cumulativeScore: 0, cumulativeSpades: 0, cumulativeCards: 0 },
    { id: 'p2', cumulativeScore: 0, cumulativeSpades: 0, cumulativeCards: 0 }
  ];
  
  // This would be the FINAL with 2 players after semi-final elimination
  result = determineQualification(players, 'SEMI_FINAL', { semifinalPlayers: 2 });
  assertEqual(result.nextPhase, 'FINAL', 'Next phase is FINAL');
});

// ============================================================
// TEST 4: Edge Cases
// ============================================================
console.log('\n📋 Test 4: Edge Cases');
console.log('-'.repeat(50));

test('All players tied - deterministic elimination', () => {
  // All tied on score, spades, cards - should use userId
  const players = [
    { id: 'player_2', cumulativeScore: 5, cumulativeSpades: 2, cumulativeCards: 5 },
    { id: 'player_0', cumulativeScore: 5, cumulativeSpades: 2, cumulativeCards: 5 },
    { id: 'player_1', cumulativeScore: 5, cumulativeSpades: 2, cumulativeCards: 5 },
    { id: 'player_3', cumulativeScore: 3, cumulativeSpades: 0, cumulativeCards: 3 }
  ];
  
  const result = determineQualification(players, 'QUALIFYING', { qualifyingPlayers: 3 });
  
  // player_3 should be eliminated (lowest score)
  assertEqual(result.eliminated[0].id, 'player_3', 'Lowest score eliminated');
});

test('Single player in phase returns no elimination', () => {
  const players = [
    { id: 'player_0', cumulativeScore: 10, cumulativeSpades: 3, cumulativeCards: 10 }
  ];
  
  const result = determineQualification(players, 'FINAL', { finalPlayers: 1 });
  
  assertEqual(result.eliminated.length, 0, 'No elimination for single player');
  assertEqual(result.nextPhase, null, 'No next phase');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
}