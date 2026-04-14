# Tournament Logic Documentation

## Overview

The tournament system uses a **single `TournamentCoordinator`** service to manage all tournament-specific logic. This replaces the previous fragmented approach with multiple managers.

---

## File Structure

```
multiplayer/server/services/
└── TournamentCoordinator.js          # Centralized tournament logic

shared/game/actions/
├── startTournament.js               # Initialize tournament
├── startQualificationReview.js      # Show qualified players with scores
├── endTournamentRound.js            # End round, eliminate player
├── endFinalShowdown.js               # Final showdown (2 players, 2 hands)
└── advanceFromQualificationReview.js # Advance from review phase
```

---

## TournamentCoordinator API

### Constructor

```javascript
new TournamentCoordinator(gameManager, matchmaking, broadcaster)
```

- `gameManager` - Game state management
- `matchmaking` - UnifiedMatchmakingService instance
- `broadcaster` - BroadcasterService instance

### Methods

#### `isTournamentActive(gameState)`

Returns `true` if the game is in knockout tournament mode.

```javascript
const isTournament = coordinator.isTournamentActive(gameState);
```

#### `handleRoundEnd(gameState, gameId, lastAction)`

Handles tournament round end logic. Determines whether to:
- Start next hand within same phase
- Transition to next tournament phase
- End the tournament

```javascript
const result = coordinator.handleRoundEnd(gameState, gameId, { type: 'trail' });
// Returns: { state: newState, gameOver: boolean, newGameId?: number }
```

#### `handleClientReady(socketId, gameId, playerIndex)`

Validates if a player can send `client-ready`. Elimininated players are rejected.

```javascript
const canReady = coordinator.handleClientReady(socketId, gameId, playerIndex);
// Returns: boolean
```

#### `getPlayerNumber(socketId, gameId, gameState)`

Gets the current player index for a socket. Returns `null` for eliminated players.

```javascript
const playerNumber = coordinator.getPlayerNumber(socketId, gameId, gameState);
// Returns: number|null
```

#### `getQualifiedPlayers(gameState)`

Returns the array of qualified player IDs.

```javascript
const qualified = coordinator.getQualifiedPlayers(gameState);
// Returns: string[] e.g., ['player_0', 'player_2']
```

---

## Tournament Phases

### Phase Flow

```
QUALIFYING (4 players) 
    → SEMI_FINAL (3 players) 
        → FINAL_SHOWDOWN (2 players) 
            → COMPLETED
```

### Phase Details

| Phase | Players | Hands | Description |
|-------|---------|-------|-------------|
| QUALIFYING | 4 | 4 | Initial knockout rounds |
| QUALIFICATION_REVIEW | 4 | 0 | Display scores, countdown to next phase |
| SEMI_FINAL | 3 | 2 | Top 3 players |
| FINAL_SHOWDOWN | 2 | 2 | Two hands, highest score wins |
| COMPLETED | 1 | 0 | Tournament ended |

---

## Shared Actions

### startTournament.js

Initializes a 4-player knockout tournament.

```javascript
const startTournament = require('../../../shared/game/actions/startTournament');

const newState = startTournament(state, {}, playerIndex);
```

**Sets:**
- `tournamentMode = 'knockout'`
- `tournamentPhase = 'QUALIFYING'`
- `tournamentRound = 1`
- All players to `ACTIVE` status

---

### startQualificationReview.js

Shows qualified players with score breakdown before advancing.

```javascript
const startQualificationReview = require('../../../shared/game/actions/startQualificationReview');

// Start review for 3 players to advance to semifinal
const reviewState = startQualificationReview(state, 3);
```

**Exports:**
- `startQualificationReview(state, qualifiedCount)` - Start review phase
- `startSemifinal(state)` - Transition to semifinal
- `startFinalShowdown(state)` - Transition to final showdown
- `getSortedPlayersByScore(state)` - Get players sorted by tournament score
- `calculateDetailedScore(captures)` - Calculate score breakdown

---

### endTournamentRound.js

Ends a tournament round and calculates scores.

```javascript
const endTournamentRound = require('../../../shared/game/actions/endTournamentRound');

const newState = endTournamentRound(state, {}, playerIndex);
```

**Logic:**
1. Calculate round scores for all active players
2. Add to cumulative tournament scores
3. If 4 players in QUALIFYING: start qualification review (3 advance)
4. If 3 players in SEMI_FINAL: start qualification review (2 advance)
5. Otherwise: eliminate lowest scorer, compress players array

**Key Functions:**
- `findLowestScorer(state)` - Find player with lowest score (uses tiebreakers)
- `compressStateForNewPhase(state, activePlayerIds)` - Rebuild players array with contiguous indices

---

### endFinalShowdown.js

Handles the final 2-player showdown.

```javascript
const endFinalShowdown = require('../../../shared/game/actions/endFinalShowdown');

const newState = endFinalShowdown(state, {}, playerIndex);
```

**Logic:**
1. Calculate hand score for each player
2. Add to cumulative tournament scores
3. Increment `finalShowdownHandsPlayed`
4. If hands played < 2: start next hand
5. If hands played >= 2: determine winner by higher cumulative score

---

## Player Identity System

### Player IDs

Players are identified by **playerId strings** (e.g., `'player_0'`, `'player_2'`) rather than numeric indices. This preserves identity across phase transitions.

### Player Statuses

| Status | Description |
|--------|-------------|
| ACTIVE | Player can play |
| ELIMINATED | Player has been eliminated |
| WINNER | Tournament winner |

### Player Status Map

```javascript
{
  'player_0': 'ACTIVE',
  'player_1': 'ELIMINATED',
  'player_2': 'ACTIVE',
  'player_3': 'ACTIVE'
}
```

### Tournament Scores Map

```javascript
{
  'player_0': 11,
  'player_2': 8,
  'player_3': 5
}
```

---

## Socket Management

### Socket-Player Mapping

The `socketPlayerMap` maps socket IDs to player indices:

```javascript
const socketMap = gameManager.socketPlayerMap.get(gameId);
const playerIndex = socketMap.get(socketId);
```

### Migration on Phase Transition

When transitioning between phases (e.g., QUALIFYING → SEMI_FINAL):

1. Create new game instance
2. Map qualified sockets to new game
3. Leave old game room, join new game room
4. Broadcast `game-over` with `nextGameId`

```javascript
_migrateSockets(oldGameId, newGameId, qualifiedPlayerIds) {
  const oldSockets = this.matchmaking.getGameSockets(oldGameId);
  const newSocketMap = new Map();

  for (const socket of oldSockets) {
    const playerId = this._getPlayerIdFromSocket(socket, oldGameId);
    if (qualifiedPlayerIds.includes(playerId)) {
      this.matchmaking.socketRegistry.set(socket.id, newGameId, 'tournament', socket.userId);
      const newIndex = qualifiedPlayerIds.indexOf(playerId);
      newSocketMap.set(socket.id, newIndex);
      socket.leave(oldGameId);
      socket.join(newGameId);
    }
  }

  this.gameManager.socketPlayerMap.set(newGameId, newSocketMap);
}
```

---

## Game Over Event

When a tournament phase ends, clients receive:

```javascript
socket.emit('game-over', {
  isTournamentMode: true,
  nextGameId: 1234567890,
  nextPhase: 'SEMI_FINAL',
  transitionType: 'auto',
  countdownSeconds: 10,
  finalScores: [11, 8, 5],
  qualifiedPlayers: ['player_0', 'player_2', 'player_3'],
  eliminatedPlayers: ['player_1']
});
```

---

## Integration with GameCoordinatorService

### Setup

```javascript
const TournamentCoordinator = require('./services/TournamentCoordinator');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, unifiedMatchmaking, broadcaster) {
    // ... other setup
    this.tournamentCoordinator = new TournamentCoordinator(
      gameManager,
      unifiedMatchmaking,
      broadcaster
    );
  }
}
```

### Usage in handleGameAction

```javascript
async handleGameAction(socket, gameId, data) {
  // ... action execution ...

  // Check if tournament
  if (this.tournamentCoordinator.isTournamentActive(newState)) {
    const playerNumber = this.tournamentCoordinator.getPlayerNumber(
      socket.id,
      gameId,
      newState
    );
    // Broadcast with player number
    this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking, playerNumber);
  }
}
```

### Usage in _handleRoundEnd

```javascript
_handleRoundEnd(gameId, newState, isPartyGame, lastAction, roundCheck) {
  if (this.tournamentCoordinator.isTournamentActive(newState)) {
    const result = this.tournamentCoordinator.handleRoundEnd(newState, gameId, lastAction);
    
    if (result.newGameId) {
      // Phase transition handled, old game will close
      return;
    }
    
    // Continue with normal broadcast
    this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
    return;
  }
  
  // ... non-tournament handling ...
}
```

---

## Client-Ready Validation

Eliminated players cannot send `client-ready`:

```javascript
handleClientReady(socketId, gameId, playerIndex) {
  const gameState = this.gameManager.getGameState(gameId);
  if (!gameState?.tournamentMode) return true;

  const player = gameState.players?.[playerIndex];
  if (!player) return false;
  
  return gameState.playerStatuses?.[player.id] !== 'ELIMINATED';
}
```

---

## Debug Utilities

### getDebugInfo

```javascript
const debugInfo = coordinator.getDebugInfo(gameId, gameState);
console.log(debugInfo);
```

**Output:**
```
[TournamentCoordinator] Debug for game 1:
  tournamentPhase: QUALIFYING
  tournamentRound: 1
  playerCount: 4
  qualifiedPlayers: ["player_0","player_2","player_3"]
  Socket map:
    abc12345 -> P0 (player_0): ACTIVE
    def67890 -> P1 (player_1): ELIMINATED
    ...
```

---

## Error Handling

Common errors and causes:

| Error | Cause |
|-------|-------|
| "No active knockout tournament" | `tournamentMode` not set to `'knockout'` |
| "Tournament is not in FINAL_SHOWDOWN phase" | Called endFinalShowdown in wrong phase |
| "No active players found" | All players eliminated incorrectly |
| "Final showdown requires exactly 2 players" | Wrong player count for final showdown |

---

## Testing

### Unit Test Example

```javascript
const TournamentCoordinator = require('./services/TournamentCoordinator');
const { initializeGame } = require('../../../shared/game');

describe('TournamentCoordinator', () => {
  let coordinator;
  let mockGameManager;
  let mockMatchmaking;
  let mockBroadcaster;

  beforeEach(() => {
    mockGameManager = {
      getGameState: jest.fn(),
      saveGameState: jest.fn(),
      socketPlayerMap: new Map()
    };
    mockMatchmaking = { getGameSockets: jest.fn(() => []) };
    mockBroadcaster = { broadcastGameUpdate: jest.fn() };
    
    coordinator = new TournamentCoordinator(
      mockGameManager,
      mockMatchmaking,
      mockBroadcaster
    );
  });

  test('isTournamentActive returns true for knockout mode', () => {
    const state = { tournamentMode: 'knockout' };
    expect(coordinator.isTournamentActive(state)).toBe(true);
  });

  test('isTournamentActive returns false for non-tournament', () => {
    const state = { tournamentMode: null };
    expect(coordinator.isTournamentActive(state)).toBe(false);
  });
});
```

---

## Migration from Old System

### Old Files (Deleted)

- `TournamentManager.js` - Replaced by `TournamentCoordinator`
- `TournamentPhaseManager.js` - Logic moved to coordinator methods
- `TournamentTurnManager.js` - Removed, use standard turn functions
- `TournamentSocketManager.js` - Logic moved to coordinator methods

### Import Changes

```javascript
// OLD
const TournamentManager = require('./TournamentManager');
const TournamentPhaseManager = require('./TournamentPhaseManager');
const TournamentTurnManager = require('./TournamentTurnManager');
const TournamentSocketManager = require('./TournamentSocketManager');

// NEW
const TournamentCoordinator = require('./TournamentCoordinator');
```

### API Mapping

| Old | New |
|-----|-----|
| `TournamentManager.isTournamentActive()` | `TournamentCoordinator.isTournamentActive()` |
| `TournamentManager.handleRoundTransition()` | `TournamentCoordinator.handleRoundEnd()` |
| `TournamentPhaseManager.transitionToSemifinal()` | `startSemifinal()` (shared action) |
| `TournamentSocketManager.isEliminated()` | `handleClientReady()` (inverse logic) |
| `TournamentTurnManager.getNextPlayer()` | Use standard turn functions |
