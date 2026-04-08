# AGENTS.md - Casino Game Development Guide

## Developer Commands

```bash
# Run the app
npm start                    # Start the app (Expo)
npm run web                  # Start web build

# Development server
npm run dev                  # Start dev server

# Testing
node __tests__/tie-breaking.test.js   # Run tie-breaking tests

# Build
npm run build                # Build for production
```

## Project Structure

- `multiplayer/server/` - Node.js game server
  - `services/TournamentCoordinator.js` - Tournament flow control
  - `services/GameCoordinatorService.js` - Game coordination
  - `game/scoring.js` - Score calculation & tie-breaking
  - `game/utils/RoundValidator.js` - Round end detection
- `shared/game/scoring.js` - Client-side scoring (must match server)
- `components/` - React components
- `hooks/` - React hooks
- `__tests__/` - Test files

## Key Patterns

### Game-Over Event (Unified)
- All game modes emit `game-over` via `GameCoordinatorService._handleGameOver()`
- RoundValidator.checkGameOver() returns `gameOver: true` for ALL completed games (including tournament)
- TournamentCoordinator only handles score accumulation, NOT event emission

### Tie-Breaking Order
1. Higher score wins
2. More spades captured
3. More cards captured  
4. Deterministic hash (card IDs) as final tie-breaker

Functions: `rankPlayers()`, `getWinnerIndex()`, `getRankings()` in scoring.js

### Tournament Flow
1. First hand created via 4-hand matchmaking
2. Subsequent hands managed by TournamentCoordinator
3. Scores accumulate across hands
4. Qualification based on cumulative points

## Important Notes

- Server and client scoring MUST match - keep shared/game/scoring.js in sync
- Use `broadcastToGame()` for events, NOT direct `io.to().emit()`
- Tests use simple node execution, not Jest (see __tests__/tie-breaking.test.js)
