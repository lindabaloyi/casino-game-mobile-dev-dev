# Tournament Integration Plan - Using GameFactory for ALL Hands

## Overview

Use `GameFactory` for creating **every hand** in the tournament (not just the first). This ensures consistent socket management, room joining, and player indexing.

---

## Implementation

### 1. Game Types

| Hand Type | Game Type | Player Count |
|-----------|-----------|--------------|
| Qualifying | `four-hands` | 4 |
| Semifinal | `three-hands` | 3 |
| Final | `two-hands` | 2 |

The `tournament` game type in `gameTypes.js` is only for the **first hand** (allows queueing).

---

### 2. TournamentCoordinator Changes

- Uses `matchmaking.gameFactory.createGame()` for all hands
- Maps player count to appropriate game type
- Gets sockets from `socketRegistry` via `_getSocketByPlayerId()`

---

### 3. Flow

```
First hand (queue) → GameFactory creates 'tournament' game
        │
        ▼
Hand ends → TournamentCoordinator.handleHandComplete
        │
        ▼
Next hand → GameFactory.createGame('four-hands'/'three-hands'/'two-hands')
        │
        ▼
... repeat until phase complete
        │
        ▼
Phase end → qualified continue, eliminated notified
        │
        ▼
Next phase starts with new player count
```

---

## Key Points

- All game creation goes through GameFactory
- Socket registration, room joining handled by factory
- Eliminated players not included in playerEntries
- No changes to existing matchmaking services