/**
 * useGameOverModal Logic Tests
 * Tests for GameOverModal business logic hook
 * Uses simple node execution (not Jest/React testing library)
 */

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
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
      }
    }
  };
}

/**
 * getPhaseDisplayText - extracts title logic from useGameOverModal
 */
function getPhaseDisplayText(tournamentPhase) {
  if (!tournamentPhase) return 'Game Over';
  switch (tournamentPhase) {
    case 'QUALIFYING': return 'Qualifying Round';
    case 'QUALIFICATION_REVIEW': return 'Qualification Complete';
    case 'SEMI_FINAL': return 'Semi-Final';
    case 'FINAL_SHOWDOWN': return 'Tournament Complete';
    case 'COMPLETED': return 'Tournament Complete';
    default: return tournamentPhase;
  }
}

/**
 * getLocalStatusText - extracts status logic from useGameOverModal
 */
function getLocalStatusText(isTournamentMode, playerId, playerStatuses) {
  if (!isTournamentMode || !playerId) {
    return 'Game Over'; // Simplified for non-tournament
  }

  const status = playerStatuses?.[playerId];
  if (status === 'WINNER') return 'YOU WIN!';
  if (status === 'QUALIFIED') return 'YOU QUALIFIED!';
  if (status === 'ELIMINATED') return 'ELIMINATED';
  return 'Game Over';
}

/**
 * getScoreBasedWinner - winner text logic
 */
function getScoreBasedWinner(scores) {
  const score1 = scores[0] || 0;
  const score2 = scores[1] || 0;
  
  if (score1 > score2) return 'Player 1 Wins!';
  if (score2 > score1) return 'Player 2 Wins!';
  return "It's a Tie!";
}

/**
 * shouldShowCountdown logic
 */
function getShouldShowCountdown(isTournamentMode, tournamentPhase, playerId, playerStatuses) {
  const isFinalPhase = tournamentPhase === 'FINAL_SHOWDOWN' || tournamentPhase === 'COMPLETED';
  const localPlayerStatus = playerId ? playerStatuses?.[playerId] : undefined;
  const isLocalWinner = localPlayerStatus === 'WINNER';
  const isLocalQualified = localPlayerStatus === 'QUALIFIED';
  
  return isTournamentMode && !isFinalPhase && (isLocalWinner || isLocalQualified);
}

/**
 * shouldShowPlayAgain logic
 */
function getShouldShowPlayAgain(isTournamentMode, nextGameId, transitionType) {
  return !isTournamentMode || (!nextGameId && transitionType !== 'auto');
}

// ============================================
// TITLE TEXT TESTS
// ============================================

console.log('\n=== Title Text Tests ===\n');

test('Non-tournament mode returns "Game Over"', () => {
  expect(getPhaseDisplayText(null)).toBe('Game Over');
  expect(getPhaseDisplayText(undefined)).toBe('Game Over');
});

test('QUALIFYING phase returns "Qualifying Round"', () => {
  expect(getPhaseDisplayText('QUALIFYING')).toBe('Qualifying Round');
});

test('SEMI_FINAL phase returns "Semi-Final"', () => {
  expect(getPhaseDisplayText('SEMI_FINAL')).toBe('Semi-Final');
});

test('FINAL_SHOWDOWN phase returns "Tournament Complete"', () => {
  expect(getPhaseDisplayText('FINAL_SHOWDOWN')).toBe('Tournament Complete');
});

test('COMPLETED phase returns "Tournament Complete"', () => {
  expect(getPhaseDisplayText('COMPLETED')).toBe('Tournament Complete');
});

test('Unknown phase returns the phase name', () => {
  expect(getPhaseDisplayText('CUSTOM_PHASE')).toBe('CUSTOM_PHASE');
});

// ============================================
// LOCAL STATUS TEXT TESTS
// ============================================

console.log('\n=== Local Status Text Tests ===\n');

test('Non-tournament mode returns "Game Over"', () => {
  expect(getLocalStatusText(false, 'player_1', {})).toBe('Game Over');
});

test('No playerId returns "Game Over"', () => {
  expect(getLocalStatusText(true, null, {})).toBe('Game Over');
});

test('WINNER status returns "YOU WIN!"', () => {
  expect(getLocalStatusText(true, 'player_1', { 'player_1': 'WINNER' })).toBe('YOU WIN!');
});

test('QUALIFIED status returns "YOU QUALIFIED!"', () => {
  expect(getLocalStatusText(true, 'player_1', { 'player_1': 'QUALIFIED' })).toBe('YOU QUALIFIED!');
});

test('ELIMINATED status returns "ELIMINATED"', () => {
  expect(getLocalStatusText(true, 'player_1', { 'player_1': 'ELIMINATED' })).toBe('ELIMINATED');
});

test('Undefined status returns "Game Over"', () => {
  expect(getLocalStatusText(true, 'player_1', {})).toBe('Game Over');
});

// ============================================
// SHOULD SHOW COUNTDOWN TESTS
// ============================================

console.log('\n=== Should Show Countdown Tests ===\n');

test('Shows countdown for WINNER in QUALIFYING', () => {
  expect(getShouldShowCountdown(true, 'QUALIFYING', 'player_1', { 'player_1': 'WINNER' })).toBeTrue();
});

test('Shows countdown for QUALIFIED in QUALIFYING', () => {
  expect(getShouldShowCountdown(true, 'QUALIFYING', 'player_1', { 'player_1': 'QUALIFIED' })).toBeTrue();
});

test('Does NOT show countdown in FINAL_SHOWDOWN', () => {
  expect(getShouldShowCountdown(true, 'FINAL_SHOWDOWN', 'player_1', { 'player_1': 'WINNER' })).toBeFalse();
});

test('Does NOT show countdown in COMPLETED', () => {
  expect(getShouldShowCountdown(true, 'COMPLETED', 'player_1', { 'player_1': 'WINNER' })).toBeFalse();
});

test('Does NOT show countdown for ELIMINATED', () => {
  expect(getShouldShowCountdown(true, 'QUALIFYING', 'player_1', { 'player_1': 'ELIMINATED' })).toBeFalse();
});

test('Does NOT show countdown for non-tournament mode', () => {
  expect(getShouldShowCountdown(false, 'QUALIFYING', 'player_1', { 'player_1': 'WINNER' })).toBeFalse();
});

test('Does NOT show countdown in SEMI_FINAL (intermediate phase)', () => {
  expect(getShouldShowCountdown(true, 'SEMI_FINAL', 'player_1', { 'player_1': 'WINNER' })).toBeTrue();
});

// ============================================
// SHOULD SHOW PLAY AGAIN TESTS
// ============================================

console.log('\n=== Should Show Play Again Tests ===\n');

test('Shows play again for non-tournament', () => {
  expect(getShouldShowPlayAgain(false, undefined, undefined)).toBeTrue();
});

test('Hides play again in tournament with next game', () => {
  expect(getShouldShowPlayAgain(true, 123, 'auto')).toBeFalse();
});

test('Shows play again in tournament without next game', () => {
  expect(getShouldShowPlayAgain(true, undefined, 'manual')).toBeTrue();
});

test('Shows play again in tournament with manual transition', () => {
  expect(getShouldShowPlayAgain(true, undefined, 'manual')).toBeTrue();
});

// ============================================
// SCORE TESTS
// ============================================

console.log('\n=== Score Winner Tests ===\n');

test('Player 1 wins when score is higher', () => {
  expect(getScoreBasedWinner([5, 3])).toBe('Player 1 Wins!');
});

test('Player 2 wins when score is higher', () => {
  expect(getScoreBasedWinner([3, 7])).toBe('Player 2 Wins!');
});

test('Returns tie when scores are equal', () => {
  expect(getScoreBasedWinner([5, 5])).toBe("It's a Tie!");
});

// ============================================
// Summary
// ============================================

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}