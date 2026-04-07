# Tournament Refactoring Findings: Centralized Game Creation via TournamentCoordinator

## Overview
The refactoring ensures that **all tournament hands (including the first) are created via the standard `GameFactory`**, with `TournamentCoordinator` as the sole orchestrator. The matchmaking service no longer auto-creates tournament games – it only collects players and returns them to the socket handler, which then calls `tournamentCoordinator.createTournament()`.

## Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| **UnifiedMatchmakingService** | Auto-created tournament game via `_createGame` | Returns `playerEntries` for `'tournament'` type (no game creation) |
| **Socket handler** | Broadcasted the auto-created game | Calls `tournamentCoordinator.createTournament()` with player entries |
| **TournamentCoordinator** | Never called → `activeTournaments` empty | Creates tournament, stores in `activeTournaments`, and creates **all hands** via `GameFactory` |
| **First hand** | Created by matchmaking (outside coordinator) | Created by `TournamentCoordinator._startNextHand` using `GameFactory` |
| **Subsequent hands** | Created inconsistently | Created by `TournamentCoordinator` using `GameFactory` |
| **Transition data** | Never sent | Sent after each phase ends (qualified/eliminated, `nextGameId`, etc.) |

## Files Modified / Verified

| File | Change | Status |
|------|--------|--------|
| `UnifiedMatchmakingService.js` | Early return for `'tournament'` game type (no auto-creation) | ✅ Done |
| `handlers/index.js` | Call `tournamentCoordinator.createTournament()` when 4 players ready | ✅ Done |
| `TournamentCoordinator.js` | Already uses `GameFactory.createGame()` for every hand – **no changes needed** | ✅ Verified |

## Expected Flow

1. **4 players join tournament queue** → matchmaking returns `playerEntries`.
2. **Socket handler** calls `tournamentCoordinator.createTournament()`.
3. **TournamentCoordinator**:
   - Creates tournament in `activeTournaments`.
   - Calls `_startNextHand()` → uses `GameFactory.createGame('four-hands', playerEntries)` → first hand starts.
   - Hand ends → `_handleTournamentRoundEnd` finds tournament → updates cumulative scores.
   - After 4 hands, `_endPhase` determines top 3 → eliminates 1 → creates new game for semifinal via `GameFactory.createGame('three-hands', qualifiedPlayers)`.
   - Emits `game-over` with `nextGameId`, `nextPhase`, `qualifiedPlayers`, `eliminatedPlayers`, `countdownSeconds`.
4. **Client** receives the event → `GameOverModal` shows countdown and auto-joins the next game.

## Final Verdict

- **All game creation now goes through the standard `GameFactory`** (two-hands, three-hands, four-hands – same as normal games).
- **TournamentCoordinator is the single owner** of tournament lifecycle – no more bypassing.
- **Matchmaking is now a pure player collector** for tournaments – it does not create games.
- **Client will receive transition data** and show the countdown modal automatically.

The refactoring plan is correct and fully implemented. No further changes are required. The tournament system is now ready to test end-to-end.