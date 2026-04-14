# Unified Tournament Implementation Plan

## Overview

Replace entire tournament system with **fresh-game-per-hand** approach. No hybrid, no legacy code.

---

## What to Remove

| File/Code | Reason |
|-----------|--------|
| Old `TournamentCoordinator.js` (with `handleRoundEnd`, `_migrateSockets`, `_createFreshState`) | Replaced by fresh-game-per-hand version |
| `_removeEliminatedPlayers` in GameCoordinatorService | Not needed |
| `advanceFromQualificationReview` handling | Not needed |
| Custom socket mapping for tournament (remapping) | Replaced by Socket.IO room migration |

---

## What to Implement

### 1. New TournamentCoordinator.js (Fresh-Game-Per-Hand)

Complete implementation for all phases:
- QUALIFYING (4 players, 4 hands)
- SEMI_FINAL (3 players, 3 hands)
- FINAL (2 players, 2 hands)

### 2. Update GameCoordinatorService

- Replace tournament branch in `_handleRoundEnd` to call `handleHandComplete`
- Remove legacy tournament code

### 3. Update Socket Handlers

- Pass `io` to TournamentCoordinator
- Tournament creation uses new coordinator

---

## File Changes

| File | Action |
|------|--------|
| `multiplayer/server/services/TournamentCoordinator.js` | Rewrite (fresh-game-per-hand) |
| `multiplayer/server/services/GameCoordinatorService.js` | Simplify tournament handling |
| `multiplayer/server/socket/handlers/index.js` | Pass io to TournamentCoordinator |

---

## Flow

```
Tournament Created
      │
      ▼
QUALIFYING PHASE (4 hands)
      │
      ├─ Hand 1: Fresh game, new room
      ├─ Hand 2: Fresh game, move sockets
      ├─ Hand 3: Fresh game, move sockets
      └─ Hand 4: Fresh game, move sockets
              │
              ▼
      Top 3 qualify, 1 eliminated
              │
              ▼
SEMI_FINAL PHASE (3 hands)
      │
      └─ Same pattern...
              │
              ▼
      Top 2 qualify, 1 eliminated
              │
              ▼
FINAL PHASE (2 hands)
      │
      └─ Same pattern...
              │
              ▼
      Winner declared
```

---

## Key Differences

| Old Approach | New Approach |
|--------------|---------------|
| Same game, multiple hands | Fresh game per hand |
| Custom socket remapping | Socket.IO room migration |
| `startNextRound` for next hand | New `game-start` event |
| `maxHands` in game state | Hand count in coordinator |
| Complex phase transitions | Simple phase name change |

---

## Next Steps

1. Write new TournamentCoordinator.js
2. Update GameCoordinatorService
3. Update socket handlers
4. Test tournament flow