# Tournament Mode Round Transition Test Suite

## Overview
This test suite verifies that the tournament mode correctly uses **playerId strings** instead of numeric indices for:
- `playerStatuses`
- `tournamentScores`
- `eliminationOrder`
- `qualifiedPlayers`

## Test Structure

```
__tests__/tournament/
├── tournament-id-mapping.test.js   # Main test file
└── helpers/
    └── tournamentTestUtils.js      # Test utilities
```

## Test Cases

### 1. Tournament Initialization
**Purpose**: Verify players are created with persistent playerId strings

```javascript
test('initializeGame creates players with persistent playerId strings', () => {
  // Verify each player has id: 'player_0', 'player_1', etc.
  // Verify id persists across the game lifecycle
});
```

### 2. Player Statuses Storage
**Purpose**: Verify playerStatuses uses playerId strings as keys

```javascript
test('playerStatuses uses playerId strings as keys', () => {
  // Start tournament
  // Verify playerStatuses keys are 'player_0', 'player_1', etc.
  // Verify NOT using numeric indices 0, 1, etc.
});
```

### 3. Tournament Scores Storage
**Purpose**: Verify tournamentScores uses playerId strings as keys

```javascript
test('tournamentScores uses playerId strings as keys', () => {
  // After scoring
  // Verify tournamentScores keys are 'player_0', etc.
});
```

### 4. Elimination Order
**Purpose**: Verify eliminationOrder contains playerId strings

```javascript
test('eliminationOrder contains playerId strings', () => {
  // Eliminate players
  // Verify eliminationOrder items are 'player_1', etc.
});
```

### 5. Qualified Players
**Purpose**: Verify qualifiedPlayers is an array of playerId strings

```javascript
test('qualifiedPlayers is array of playerId strings', () => {
  // After qualification review
  // Verify qualifiedPlayers = ['player_0', 'player_2']
});
```

### 6. Round Transition - Qualifying to Semi-Final
**Purpose**: Verify round transition preserves playerId references

```javascript
test('Qualifying to Semi-Final preserves playerId references', () => {
  // Start with 4 players
  // Eliminate 2 players
  // Transition to Semi-Final (2 players)
  // Verify playerStatuses still uses original playerId strings
  // Verify winner display shows correct player number
});
```

**Scenario**:
- Initial: Players 0,1,2,3 (player_0, player_1, player_2, player_3)
- After Qualifying: Players 1,3 advance (qualifiedPlayers = ['player_1', 'player_3'])
- Semi-Final state: playerStatuses should have 'player_1' and 'player_3' as keys
- Winner of Semi-Final: Should be correctly identified as Player 2 or Player 4

### 7. Round Transition - Semi-Final to Final Showdown
**Purpose**: Verify Semi-Final to Final Showdown preserves playerId references

```javascript
test('Semi-Final to Final Showdown preserves playerId references', () => {
  // Start Semi-Final with 2 players
  // Complete Final Showdown
  // Verify winner is correctly identified
});
```

### 8. Winner Display Correctness
**Purpose**: Verify winner is displayed correctly regardless of round transitions

```javascript
test('winner is correctly displayed after multiple round transitions', () => {
  // Full tournament flow: Qualifying → Semi-Final → Final Showdown
  // Verify winner's player number is correct
  // Verify playerStatuses['winner_id'] === 'WINNER'
});
```

### 9. Spectator View Rendering
**Purpose**: Verify SpectatorView correctly displays with playerId strings

```javascript
test('SpectatorView displays correct player numbers with playerId strings', () => {
  // Setup tournament state with playerId strings
  // Render SpectatorView
  // Verify player numbers are correctly extracted from playerId
});
```

### 10. Tournament Status Bar Rendering
**Purpose**: Verify TournamentStatusBar correctly displays with playerId strings

```javascript
test('TournamentStatusBar displays correct player numbers with playerId strings', () => {
  // Setup tournament state with playerId strings
  // Render TournamentStatusBar
  // Verify all player data is correctly displayed
});
```

## Test Utilities

### `createMockTournamentState(overrides)`
Creates a mock tournament state with playerId strings:
```javascript
{
  players: [
    { id: 'player_0', name: 'Player 1', ... },
    { id: 'player_1', name: 'Player 2', ... },
    { id: 'player_2', name: 'Player 3', ... },
    { id: 'player_3', name: 'Player 4', ... }
  ],
  playerStatuses: {
    'player_0': 'ACTIVE',
    'player_1': 'ELIMINATED',
    'player_2': 'ACTIVE',
    'player_3': 'WINNER'
  },
  tournamentScores: {
    'player_0': 10,
    'player_1': 5,
    'player_2': 15,
    'player_3': 20
  },
  qualifiedPlayers: ['player_0', 'player_2'],
  eliminationOrder: ['player_1', 'player_3']
}
```

### `verifyPlayerIdMapping(originalIndex, displayNumber)`
Helper to verify mapping:
- 'player_0' → Player 1
- 'player_1' → Player 2
- 'player_2' → Player 3
- 'player_3' → Player 4

### `simulateTournamentRoundTransition(state, fromPhase, toPhase)`
Simulates round transition and returns new state with preserved playerId references.

## Running Tests

```bash
# Run all tournament tests
npm test -- --testPathPattern="tournament"

# Run specific test
npm test -- --testPathPattern="tournament-id-mapping"

# Run with coverage
npm test -- --coverage --testPathPattern="tournament"
```

## Expected Results

All tests should pass, confirming:
1. ✅ Player objects have persistent playerId strings
2. ✅ Tournament state uses playerId strings instead of numeric indices
3. ✅ Round transitions preserve playerId references correctly
4. ✅ Winner is correctly identified and displayed
5. ✅ Client components correctly extract player numbers from playerId strings