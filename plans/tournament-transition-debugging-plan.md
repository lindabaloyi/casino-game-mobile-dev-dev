# Debugging: 4-Player Qualifying → 3-Player Semi-Final Transition

## Problem Statement

After completing the 4-hand qualifying phase, the tournament should:
1. Eliminate the lowest-ranked player
2. Start a 3-player semi-final with 13 cards each and 1 table card

Currently, the transition appears to fail - the game remains in a 4-player layout.

## Debugging Checkpoints

| Step | Location | What to Verify | Expected Value |
|------|----------|----------------|----------------|
| 1 | TournamentCoordinator.js:305 | phaseComplete after hand 4 | true |
| 2 | TournamentCoordinator.js:327 | qualified array length | 3 |
| 3 | TournamentCoordinator.js:327 | eliminated array length | 1 |
| 4 | TournamentCoordinator.js:92 | activePlayers count in _startNextHand | 3 |
| 5 | TournamentCoordinator.js:95 | gameType returned | three-hands |
| 6 | GameFactory.createGame | 3-player config | 13 cards/player, 1 table card |

## Add Debug Logs

### 1. TournamentCoordinator.js - handleHandComplete (line ~305)
const phaseComplete = tournament.currentHand >= tournament.totalHands;
console.log(\[DEBUG] phaseComplete: \ (hand \/\)\);

### 2. TournamentCoordinator.js - _endPhase (line ~327)
const { qualified, eliminated, nextPhase, sortedPlayers } = TournamentQualification.determineQualification(...);
console.log(\[DEBUG] Qualified (\):\, qualified.map(p => p.id));
console.log(\[DEBUG] Eliminated (\):\, eliminated.map(p => p.id));
console.log(\[DEBUG] Next phase: \\);

### 3. TournamentCoordinator.js - _startNextHand (line ~92)
const activePlayers = tournament.players.filter(p => !p.eliminated);
const playerCount = activePlayers.length;
console.log(\[DEBUG] Active players after filtering: \\);
console.log(\[DEBUG] Game type: \\);

### 4. GameFactory.js - createGame
console.log(\[GameFactory] Creating \ with \ players\);

## Code Flow Verification

QUALIFYING PHASE (hands 1-4):
- totalHands = 4 (set in registerExistingGameAsTournament)
- currentHand increments after each hand completes
- After hand 4: phaseComplete = true → _endPhase()

_endPhase():
- Calls determineQualification()
- Returns qualified (top 3) and eliminated (bottom 1)
- Calls markEliminated(eliminated) → p.eliminated = true
- Sets next phase config (semifinalHands = 3)
- Calls _startNextHand()

_startNextHand():
- Filters: activePlayers = players.filter(!p.eliminated) → 3 players
- Gets gameType = _getGameTypeForPlayerCount(3) → three-hands
- Calls createGame(three-hands, playerEntries)

GameFactory.createGame(three-hands, ...):
- Uses config from gameTypes.js
- Creates 3-player game with 13 cards per player, 1 table card
- Registers players and starts game

## Potential Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| phaseComplete never true | totalHands not set to 4 or currentHand not incrementing | Verify registration sets totalHands: 4 |
| All 4 players qualified | qualifiedCount returns 4 instead of 3 | Check config.qualifyingPlayers (should be 3) |
| 4-player game created after elimination | p.eliminated flag not set or not checked | Verify markEliminated() is called, check filter |
| Wrong game type for 3 players | _getGameTypeForPlayerCount(3) returns wrong type | Ensure case 3 returns three-hands |
| 3-player game uses 10 cards | gameTypes.js three-hands config is wrong | Verify 13 cards/player, 1 table card |

## Verification Commands

Run tournament and check for these log patterns:

# After hand 4, look for:
[DEBUG] phaseComplete: true
[DEBUG] Qualified (3): player_0..., player_1..., player_2...
[DEBUG] Eliminated (1): player_3...
[DEBUG] Player count after filtering: 3
[DEBUG] Game type: three-hands
[GameFactory] Creating three-hands game with userIds: [...]

## Next Steps

1. Add debug logs to all checkpoints
2. Run a full 4-hand tournament
3. Verify each checkpoint passes
4. Fix any failing checkpoint based on root cause
