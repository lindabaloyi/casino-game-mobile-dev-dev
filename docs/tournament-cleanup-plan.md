# Tournament Legacy Cleanup Plan

## Overview
After refactoring tournament to use existing 4-hand free-for-all matchmaking, there are still remnants of the old `'tournament'` gameType that need to be removed or retained.

## Files to Modify

### 1. `config/gameTypes.js` (HIGH PRIORITY)
- **Line 47-55**: Remove `'tournament'` entry
- **Reason**: No longer used - first hand now uses `'four-hands'`

### 2. `services/QueueManager.js` (HIGH PRIORITY)
- **Line 17**: Remove `'tournament': { minPlayers: 4, maxPlayers: 4 }` from GAME_TYPES
- **Reason**: Tournament queue now uses `'four-hands'` queue

### 3. `services/CleanupScheduler.js` (MEDIUM)
- **Line 67**: Remove `'tournament'` from gameTypes array
- **Reason**: Cleanup scheduler iterates over all game types

### 4. `services/TournamentCoordinator.js` (HIGH PRIORITY)
- **Lines 39-81**: Remove `createTournament()` method (old first-hand creation)
- **Lines 77-81**: Remove `createQualifier()` alias
- **Lines 86-203**: Review `_startNextHand()` - now only used for hands 2+, not first
- **Note**: Keep `registerExistingGameAsTournament()` (new method)
- **Note**: Keep `handleHandComplete()`, `_handleTournamentRoundEnd()`, `_endPhase()`, `_endTournament()`

### 5. `socket/handlers/index.js` (LOW)
- **Line 371**: Keep `'tournament'` in queue status map
- **Reason**: Client still listens for `tournament-waiting` events to show waiting UI

### 6. `socket/handlers/broadcast.js` (LOW)
- **Lines 166-167**: Keep tournament broadcast functions
- **Reason**: Still needed for waiting room UI

### 7. `services/BroadcasterService.js` (LOW)
- **Line 150**: Keep `'tournament'` gameMode
- **Reason**: May still be used for game-over payloads

### 8. `services/GamePersistenceService.js` (LOW)
- **Line 131**: Keep `'tournament'` return
- **Reason**: Stats/migration scripts reference it

### 9. `models/GameStats.js` & Migration Scripts (DO NOT TOUCH)
- These are data model definitions, not code paths

---

## Implementation Order

1. **Remove `'tournament'` from gameTypes.js** - Breaks nothing, just unused config
2. **Remove `'tournament'` from QueueManager.js** - Removes queue type
3. **Remove `'tournament'` from CleanupScheduler.js** - Sync with QueueManager
4. **Clean up TournamentCoordinator.js** - Remove old createTournament/createQualifier, keep coordinator logic for hands 2+

---

## What to KEEP (Do Not Delete)

| Component | Reason |
|-----------|--------|
| `TournamentCoordinator` class | Handles hands 2+, phase transitions, elimination |
| `registerExistingGameAsTournament()` | New method for first hand registration |
| `handleHandComplete()` | Called by GameCoordinatorService after each hand |
| `handleRoundEnd()` | Entry point for tournament round processing |
| `_endPhase()` | Handles QUALIFYING→SEMI_FINAL→FINAL transitions |
| `_endTournament()` | Final winner declaration |
| Tournament queue UI handlers | Client needs waiting room feedback |

---

## What to REMOVE (Legacy Code)

| Component | Reason |
|-----------|--------|
| `createTournament(players, config)` | Replaced by first-hand via matchmaking |
| `createQualifier(players, config)` | Alias for above, unused |
| `_startNextHand()` for first hand | Only needed for hands 2+ now |
| `'tournament'` gameType in config | No longer used |

---

## Testing After Cleanup

1. Start server, join 4 players to tournament queue
2. Verify first hand starts as normal 4-hand game
3. Play through 13 rounds, verify game-over
4. Verify coordinator starts hand 2 (or transitions to next phase)
5. Verify all phases work: QUALIFYING → SEMI_FINAL → FINAL