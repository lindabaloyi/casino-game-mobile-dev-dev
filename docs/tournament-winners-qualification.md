# Tournament Mode: Winners, Qualified & Disqualified Players

## Overview

The tournament mode uses a knockout-style bracket with three phases:
- **QUALIFYING**: 4 hands, top 3 players qualify
- **SEMI_FINAL**: 3 hands, top 2 players qualify  
- **FINAL**: 2 hands, winner declared

## Determining Winners

### Tie-Breaking Order

When multiple players have the same score, the following tie-breakers are applied in order:

1. **Higher total score** - Cumulative points across hands
2. **More spades captured** - Number of spade cards taken
3. **More cards captured** - Total number of cards taken
4. **Deterministic hash** - Hash of card IDs as final tie-breaker

The tie-breaking logic is implemented in `rankPlayers()` in `shared/game/scoring.js:154`:

```javascript
ranked.sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  if (b.spades !== a.spades) return b.spades - a.spades;
  if (b.cards !== a.cards) return b.cards - a.cards;
  return a.hash - b.hash;
});
```

### Final Winner

The tournament winner is determined in `_endTournament()` (`multiplayer/server/services/TournamentCoordinator.js:395`):
- The player with the highest cumulative score after the final hand wins
- All players receive their final rank

## Qualified Players

### Qualification Process

At the end of each phase, players are ranked by cumulative score:

1. **QUALIFYING phase** (4 hands):
   - Top 3 players qualify for SEMI_FINAL
   - Bottom player is eliminated

2. **SEMI_FINAL phase** (3 hands):
   - Top 2 players qualify for FINAL
   - Bottom player is eliminated

3. **FINAL phase** (2 hands):
   - Top player wins the tournament
   - Runner-up is 2nd place

### Qualification Logic

The qualification logic is in `_endPhase()` (`TournamentCoordinator.js:281`):

```javascript
const activePlayers = tournament.players.filter(p => !p.eliminated);
activePlayers.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

let qualifiedCount;
if (tournament.phase === 'QUALIFYING') {
  qualifiedCount = tournament.config.qualifyingPlayers; // 3
} else if (tournament.phase === 'SEMI_FINAL') {
  qualifiedCount = 2;
}

const qualified = activePlayers.slice(0, qualifiedCount);
const eliminated = activePlayers.slice(qualifiedCount);
```

### Score Reset Between Phases

When players qualify for the next phase:
- Their cumulative score resets to 0
- Hands played resets to 0
- They start fresh in the new phase

This is handled in `TournamentCoordinator.js:320`:

```javascript
tournament.players = tournament.players.map(p => {
  if (qualified.some(q => q.id === p.id)) {
    p.cumulativeScore = 0;
    p.handsPlayed = 0;
  }
  return p;
});
```

## Disqualified/Eliminated Players

### Elimination Criteria

A player is eliminated when they:
- Finish in the bottom position(s) at the end of a phase
- Are not among the qualified players for the next phase

### Player Status Tracking

Player statuses are tracked in the game state:
- `ACTIVE` - Player is still competing
- `ELIMINATED` - Player has been knocked out

Status is set in `TournamentCoordinator.js:342`:

```javascript
playerStatuses: Object.fromEntries(
  tournament.players.map(p => [p.id, p.eliminated ? 'ELIMINATED' : 'ACTIVE'])
)
```

### Client Rejection

Eliminated players are rejected from readying up in subsequent hands via `handleClientReady()` (`TournamentCoordinator.js:23`):

```javascript
handleClientReady(socketId, gameId, playerIndex) {
  const player = gameState.players?.[playerIndex];
  if (!player) return false;
  return gameState.playerStatuses?.[player.id] !== 'ELIMINATED';
}
```

### Disqualified Players Array

The `eliminatedPlayers` array is included in the game-over payload (`TournamentCoordinator.js:344`):

```javascript
const gameOverPayload = {
  // ...
  eliminatedPlayers: eliminatedIds,
  // ...
};
```

## Game-Over Payload

When a tournament phase ends, the following is emitted:

```javascript
{
  winner: string,           // Player ID of phase winner
  finalScores: number[],    // Cumulative scores for all players
  isTournamentMode: true,
  playerStatuses: {         // ACTIVE or ELIMINATED per player
    [playerId]: string
  },
  qualifiedPlayers: string[],     // Players moving to next phase
  eliminatedPlayers: string[],    // Players knocked out
  nextGameId: string,             // Game ID of next phase
  nextPhase: string,              // Next phase name
  transitionType: 'auto',
  countdownSeconds: number,
  scoreBreakdowns: object[]       // Detailed score info
}
```

## Phase Transition

1. Phase completes after configured number of hands
2. Players ranked by cumulative score
3. Top players qualify, bottom players eliminated
4. Scores reset for qualified players
5. New game created for next phase
6. 8-second countdown before next phase starts
7. `game-start` emitted to qualified players only
