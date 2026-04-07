# Comparison: 4-Hand Free-For-All vs Tournament Mode

## Overview

Both "4-hand free-for-all" (`freeforall`) and "tournament" modes fundamentally create games with 4 players using the same game creation mechanism. They share the same core flow but diverge in how games progress and handle multiple hands.

---

## Shared Foundation

Both modes use identical game creation logic:

| Component | freeforall | tournament |
|-----------|------------|------------|
| `gameTypes.js` config | `createGame: (gm) => gm.startGame(4, false)` | `createGame: (gm) => gm.startTournamentGame()` |
| `QueueManager` | `minPlayers: 4, maxPlayers: 4` | `minPlayers: 4, maxPlayers: 4` |
| `GameFactory` | Same factory, same flow | Same factory, same flow |
| Initial player count | 4 players | 4 players |

---

## Key Differences

### 1. Game Creation

**freeforall** (`UnifiedMatchmakingService.js:66-88`)
```javascript
_createGame(gameType, playerEntries) {
  const result = this.gameFactory.createGame(gameType, playerEntries);
  // Immediate game start with normal registration
}
```

**tournament** (`TournamentCoordinator.js:39-73`)
```javascript
async createTournament(players, config = {}) {
  // Creates tournament object with phases
  // Calls _startNextHand() which creates game via gameFactory
}
```

### 2. Game Initialization

| Aspect | freeforall | tournament |
|--------|------------|------------|
| `startGame(4, false)` | Uses `startGame` | Uses `startTournamentGame` |
| Tournament state | None | `tournamentMode: 'knockout'` |
| Phases | Single hand | QUALIFYING → SEMI_FINAL → FINAL |
| Score tracking | Per-game | Cumulative across hands |

### 3. Multi-Hand Progression

**freeforall**
- Single game instance
- 13 rounds then game over
- No automatic continuation

**tournament**
- Fresh game created per hand via `TournamentCoordinator._startNextHand()`
- Each hand: `gameFactory.createGame(gameType, playerEntries)`
- Tracks: `currentHand`, `totalHands`, `cumulativeScore`
- Handles elimination between phases

### 4. Phase Management

```javascript
// TournamentCoordinator._endPhase()
if (tournament.phase === 'QUALIFYING') {
  qualifiedCount = tournament.config.qualifyingPlayers; // 3
  nextPhase = 'SEMI_FINAL';
} else if (tournament.phase === 'SEMI_FINAL') {
  qualifiedCount = 2;
  nextPhase = 'FINAL';
} else {
  await this._endTournament(tournamentId, activePlayers);
}
```

---

## Why Tournament May Not Start Correctly

### Likely Issues

1. **Socket/Player ID mismatch** (`TournamentCoordinator.js:101-115`)
   - Players passed to `createTournament` may have null `id` if guest
   - Fallback logic tries `socketId` but may fail if not stored

2. **Socket registry not updated** (`TournamentCoordinator.js:166-168`)
   - Only updates `socketRegistry` after game creation
   - If lookup happens before update, player not found

3. **Player count mismatch in phases**
   - After elimination, `_getGameTypeForPlayerCount` handles 3→2→4
   - But game type must exist for 2-player (it does: `two-hands`)

4. **client-ready rejection** (`index.js:274-279`)
   - Eliminated players rejected but may not receive proper notification

### Debug Points to Check

| Location | What to Log |
|----------|-------------|
| `TournamentCoordinator.js:101` | `playerEntries` before game creation |
| `TournamentCoordinator.js:117` | `result` from gameFactory |
| `TournamentCoordinator.js:155-161` | Socket lookup for each player |
| Socket handler `join-tournament-queue` | Raw player data from queue |

---

## Architecture Diagram

```
User joins tournament queue
        ↓
QueueManager._tryCreateGame() → 4 players
        ↓
Socket handler receives playerEntries
        ↓
tournamentCoordinator.createTournament(players, config)
        ↓
TournamentCoordinator._startNextHand()
        ↓
matchmaking.gameFactory.createGame(gameType, playerEntries)
        ↓
GameManager.startTournamentGame() (sets tournamentMode)
        ↓
Game created with tournament state in gameState
        ↓
game-start emitted to players
```

---

## Summary

| Feature | freeforall | tournament |
|---------|------------|------------|
| Game creation | `startGame(4, false)` | `startTournamentGame()` |
| Hands | 1 | Multiple (QUALIFYING→SEMI_FINAL→FINAL) |
| Score | Per-game | Cumulative |
| Elimination | No | Yes (after each phase) |
| Phase transition | N/A | Auto after `totalHands` |
| Player removal | No | After each phase |

The core mechanism is identical—`gameFactory.createGame()` is called in both cases. The difference is that tournament wraps this with additional state management (`TournamentCoordinator`) to handle multi-hand progression and elimination.