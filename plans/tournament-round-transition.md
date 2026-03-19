# Tournament Round Transition Plan

## Current Issue
Looking at the debug logs, the game ends after round 1 because:
```
[RoundValidator] checkGameOver: 4-player mode detected, ending game after round 1
```

## Problem
The current 4-player free-for-all mode ends the game after 1 round. In tournament mode, we need multiple rounds to eliminate players.

## Required Changes

### 1. Check where game-over is triggered
Find `checkGameOver` function and modify it to NOT end game when `tournamentMode=true`.

### 2. Modify RoundValidator (server-side)
In `multiplayer/server/services/GameCoordinatorService.js` or similar:

- **Don't end game automatically** for tournament mode
- Instead, trigger tournament round transition logic

### 3. Tournament Flow Logic

**After each round ends in tournament mode:**
```
1. Calculate scores for all players
2. Sort players by score (ascending)
3. Eliminate lowest scorer(s)
4. Update playerStatuses:
   - ELIMINATED: player with lowest score
   - ACTIVE: remaining players
5. Check remaining players:
   - If 4 players: Start Round 2 (next round)
   - If 3 players: Start Round 3 (semi-final)
   - If 2 players: Start Final Showdown (2 hands)
   - If 1 player: Declare winner, end tournament
```

### 4. Server Actions Needed

Create/update actions:
- `endTournamentRound` - handles elimination between rounds
- `startTournamentRound` - initializes next round
- `endFinalShowdown` - handles final 2-player showdown

### 5. Frontend Changes

- Show "Round X Complete" modal with:
  - Scores for all players
  - Who was eliminated
  - "Next Round" button
  
- For final showdown:
  - Show "Final Showdown" (2 hands)
  - Track hands played
  - After 2 hands, declare winner

### 6. Integration with startTournament

When `startTournament` is called:
```
- Set tournamentMode = 'knockout'
- Set tournamentPhase = 'QUALIFYING' (4 players)
- Set all playerStatuses = 'ACTIVE'
- Start first round
```

### 7. Game State Properties (already added)

These already exist in initialization:
- `tournamentMode`: 'knockout' | null
- `tournamentPhase`: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED'
- `tournamentRound`: number
- `playerStatuses`: { [playerIndex]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' }
- `tournamentScores`: { [playerIndex]: number }
- `eliminationOrder`: number[]
- `finalShowdownHandsPlayed`: number

## Implementation Priority

1. **Modify checkGameOver** - Don't end game for tournament mode
2. **Create endTournamentRound action** - Handle elimination
3. **Update frontend** - Show elimination info in game-over modal
4. **Add "Next Round" button** - Allow players to continue

## Notes
- The scoring logic already works: `[4, 2, 0, 1]` shows P0 wins, P2 has 0 points
- In tournament, lowest score should be eliminated (P2 with 0 points)
- After elimination: P0, P1, P3 continue → 3 players
