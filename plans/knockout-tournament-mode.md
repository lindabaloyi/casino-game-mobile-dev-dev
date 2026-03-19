# Knockout Tournament Mode - Specification

## Overview
A knockout tournament system where 4 players compete in free-for-all matches, with the lowest-scoring player eliminated after each round until 2 remain for a final showdown.

## Tournament Structure

### Phases
1. **QUALIFYING** - 4 players compete, lowest eliminated each round
2. **SEMI_FINAL** - 3 players compete, lowest eliminated  
3. **FINAL_SHOWDOWN** - Last 2 players compete in 2 hands
4. **COMPLETED** - Tournament ends, winner declared

### Progression Flow
```
4 players → [Round 1] → Eliminate lowest → 3 players
3 players → [Round 2] → Eliminate lowest → 2 players  
2 players → [Final Round] → 2 hands → Winner
```

## State Management

### New Game State Properties
```javascript
{
  tournamentMode: 'knockout' | null,
  tournamentPhase: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED',
  tournamentRound: 1,  // Current round number
  playerStatuses: {
    [playerIndex]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER'
  },
  tournamentScores: {
    [playerIndex]: 0  // Cumulative score across rounds
  },
  eliminationOrder: [],  // [playerIndex, playerIndex, ...]
  finalShowdownHandsPlayed: 0,  // 0, 1, or 2
  tournamentWinner: null | playerIndex,
  roundsInPhase: {
    QUALIFYING: 1,  // Can have multiple qualifying rounds
    SEMI_FINAL: 1,
  }
}
```

## Elimination Logic

### After Each Round
1. Calculate total captures for each ACTIVE player
2. Find player with LOWEST score
3. Mark that player as ELIMINATED
4. Add to eliminationOrder
5. Remaining players advance to next phase

### Tie-Breaking
- If tied for lowest, use card count in captures (fewer is better)
- If still tied, eliminate player with lower position in seating

## Final Showdown

### Rules
- Triggered when only 2 players remain
- Exactly 2 hands are played between them
- Combined score from both hands determines winner
- Player with HIGHER total wins

### Hand Tracking
```javascript
finalShowdownHandsPlayed: 0 → 1 → 2
// After hand 2: determine winner
```

## Spectator Mode

### Transition to Spectator
When player is eliminated:
1. Change status from ACTIVE → ELIMINATED → SPECTATOR
2. Remove from active turn rotation
3. Keep connection to game room
4. Show spectator UI

### Spectator Capabilities
- View all hands (other players' cards)
- View table cards and builds
- See all scores and standings
- Cannot play cards or take actions
- See game history and events

### Spectator UI
- Show "You have been eliminated" message
- "Watch as spectator" button
- Continue viewing game state
- Option to leave tournament

## Server-Side Implementation

### New Actions
1. **startTournament** - Initialize knockout mode with 4 players
2. **endRound** - Calculate scores, eliminate lowest, advance
3. **startFinalShowdown** - Begin 2-hand final
4. **endTournament** - Declare winner, distribute rewards

### Game Loop Changes
```javascript
// In round end logic
if (tournamentMode === 'knockout') {
  if (remainingPlayers === 2) {
    return startFinalShowdown();
  } else {
    return eliminateLowestPlayer();
  }
}
```

## Frontend Implementation

### New Components
1. **TournamentStatusBar** - Shows tournament progress, phases
2. **EliminationModal** - Shows when player is eliminated
3. **SpectatorView** - Alternative UI for eliminated players
4. **FinalShowdownIndicator** - Shows progress in final (1/2, 2/2)
5. **TournamentWinnerModal** - Celebration when winner declared

### UI Updates
- Tournament bracket visualization
- Player status indicators (active/eliminated/spectator)
- Score leaderboard across rounds
- Elimination announcements

## Data Flow

### Tournament Initialization
```
Room created → 4 players join → Start Tournament
→ Initialize tournament state
→ Set all players to ACTIVE
→ Set phase to QUALIFYING
```

### Round Progression
```
Hand ends → Check if round should end
→ If round ends: calculate scores
→ Eliminate lowest → Update status
→ Check if 2 remain → Start final OR next round
```

### Final Showdown
```
2 players remain → Increment to FINAL_SHOWDOWN
→ Play hand → Increment hand count
→ If hand count == 2 → Compare scores
→ Declare winner → Mark COMPLETED
```

## File Structure

### New Files
- `shared/game/actions/tournament.js` - Tournament actions
- `components/tournament/TournamentStatusBar.tsx`
- `components/tournament/EliminationModal.tsx`
- `components/tournament/SpectatorView.tsx`
- `components/tournament/FinalShowdownIndicator.tsx`

### Modified Files
- `shared/game/state.js` - Add tournament state
- `shared/game/initialization.js` - Tournament state init
- `hooks/useGameState.ts` - Tournament state access
- `app/tournament.tsx` - Tournament game screen

## Acceptance Criteria

1. ✅ 4 players can start a knockout tournament
2. ✅ After each round, lowest scorer is eliminated
3. ✅ Eliminated players become spectators
4. ✅ When 2 remain, final showdown begins (2 hands)
5. ✅ Winner is determined by combined score in final
6. ✅ All players can watch as spectators
7. ✅ Tournament phase is clearly displayed
8. ✅ Scores are tracked across all rounds
