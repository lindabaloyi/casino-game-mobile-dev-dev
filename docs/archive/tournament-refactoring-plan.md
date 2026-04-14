# Tournament Coordinator Refactoring Plan

## Goal
Refactor tournament game creation so that **all tournament hands are created via the standard GameFactory**, with the TournamentCoordinator as the sole orchestrator of tournament lifecycle.

## Current State (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATCHMAKING FLOW (BROKEN)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  player joins tournament queue                                  │
│         │                                                       │
│         ▼                                                       │
│  UnifiedMatchmakingService.addToQueue()                        │
│         │                                                       │
│         ▼                                                       │
│  QueueManager detects 4 players                                │
│         │                                                       │
│         ▼                                                       │
│  _createGame() called (auto-creates via gameTypes.js!)          │
│         │                                                       │
│         ▼                                                       │
│  GameManager.startTournamentGame() creates game                │
│         │                                                       │
│         ▼                                                       │
│  TournamentCoordinator.createTournament() NEVER called        │
│         │                                                       │
│         ▼                                                       │
│  activeTournaments Map stays EMPTY                             │
│         │                                                       │
│         ▼                                                       │
│  Round ends → _handleTournamentRoundEnd finds no tournament   │
│         │                                                       │
│         ▼                                                       │
│  Returns { gameOver: false } → regular game-over flow          │
│         │                                                       │
│         ▼                                                       │
│  ❌ Client never receives transition data                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Target State (After)

```
┌─────────────────────────────────────────────────────────────────┐
│                   MATCHMAKING FLOW (REFACTORED)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  player joins tournament queue                                  │
│         │                                                       │
│         ▼                                                       │
│  UnifiedMatchmakingService.addToQueue()                        │
│         │                                                       │
│         ▼                                                       │
│  QueueManager detects 4 players                                │
│         │                                                       │
│         ▼                                                       │
│  ✅ Returns playerEntries (NO auto-create for tournament)      │
│         │                                                       │
│         ▼                                                       │
│  Socket handler receives playerEntries                         │
│         │                                                       │
│         ▼                                                       │
│  ✅ Calls tournamentCoordinator.createTournament(players)    │
│         │                                                       │
│         ▼                                                       │
│  TournamentCoordinator.createTournament()                     │
│         │                                                       │
│         ▼                                                       │
│  ✅ Creates tournament in activeTournaments Map                │
│         │                                                       │
│         ▼                                                       │
│  _startNextHand() creates hand via GameFactory                 │
│         │                                                       │
│         ▼                                                       │
│  gameFactory.createGame('four-hands', playerEntries)           │
│         │                                                       │
│         ▼                                                       │
│  Same as regular game creation!                                │
│         │                                                       │
│         ▼                                                       │
│  Round ends → _handleTournamentRoundEnd finds tournament      │
│         │                                                       │
│         ▼                                                       │
│  ✅ Returns { gameOver: true, nextHand: true }                 │
│         │                                                       │
│         ▼                                                       │
│  ✅ Emits game-over with transition data                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Changes Summary

### 1. UnifiedMatchmakingService.js
**Purpose:** Stop auto-creating tournament games

```javascript
addToQueue(socket, gameType, userId) {
  // ... existing logic ...
  
  // For tournaments, don't auto-create game
  if (gameType === 'tournament') {
    console.log(`[UnifiedMatchmaking] Tournament queue full, returning players to coordinator`);
    return playerEntries;  // Return player entries instead of calling _createGame
  }

  return this._createGame(gameType, playerEntries);
}
```

### 2. Socket Handler (handlers/index.js)
**Purpose:** Bridge from matchmaking to TournamentCoordinator

```javascript
socket.on('join-tournament-queue', async () => {
  // ... existing logic ...
  
  if (result) {  // result = playerEntries for tournament
    const players = result.players.map(p => ({
      id: p.userId,
      socketId: p.socket.id,
      name: `Player ${p.playerNumber + 1}`
    }));
    
    await tournamentCoordinator.createTournament(players, {
      qualifyingHands: 4,
      qualifyingPlayers: 3,
      semifinalHands: 3,
      finalHands: 2
    });
  }
});
```

### 3. TournamentCoordinator.js
**No changes needed** - already uses GameFactory for all hands in `_startNextHand()`:

```javascript
async _startNextHand(tournamentId) {
  // ...
  const result = this.matchmaking.gameFactory.createGame(gameType, playerEntries);
  // ...
}
```

## File Changes

| File | Change | Status |
|------|--------|--------|
| `UnifiedMatchmakingService.js` | Early return for tournament type | ✅ Done |
| `handlers/index.js` | Call `tournamentCoordinator.createTournament()` | ✅ Done |
| `TournamentCoordinator.js` | No changes needed (already uses GameFactory) | ✅ Verified |

## Verification Checklist

- [ ] 4 players join tournament queue
- [ ] Matchmaking returns player entries (no auto-create)
- [ ] Socket handler calls `createTournament()`
- [ ] Tournament appears in `activeTournaments` Map
- [ ] First hand created via GameFactory
- [ ] Round ends → tournament round end handler finds tournament
- [ ] Client receives `game-over` with transition data
- [ ] Phase transitions work (QUALIFYING → SEMI_FINAL → FINAL)

## Architecture Benefits

1. **Single source of truth** - TournamentCoordinator owns all tournament lifecycle
2. **Consistent game creation** - All hands use standard GameFactory
3. **Clean separation** - Matchmaking just collects players; Coordinator orchestrates
4. **Transition data flows** - Client receives `nextGameId`, `nextPhase`, `eliminatedPlayers`