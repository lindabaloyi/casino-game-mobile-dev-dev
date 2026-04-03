# Game Ready Flag Implementation Plan

## Problem
After all players connect in lobby, game navigates to multiplayer game without checking if game is actually initialized. Some games are being initialized while a player hasn't initiated their cards yet.

## Solution
Implement a "game-ready" flag system that ensures all players have their game components loaded before navigating to the game screen.

## Architecture

### Current Flow (Problematic)
```
All players joined → Server emits 'game-start' → Client navigates immediately
❌ Problem: Navigation happens before cards are dealt on all clients
```

### New Flow (Fixed)
```
All players joined → Server creates game → Server sends 'game-init'
→ Each client validates and sends 'client-ready'
→ Server waits for ALL clients → Server broadcasts 'game-start'
→ All clients navigate together
```

## Implementation Steps

### 1. Server-Side Changes

#### A. Add Ready Tracking to GameManager
- Add `clientReadyMap: Map<gameId, Set<playerIndex>>` to track which clients are ready
- Add `markClientReady(gameId, playerIndex)` method
- Add `areAllClientsReady(gameId, playerCount)` method

#### B. New Socket Events
- `client-ready`: Client → Server (sent after local game validation)
- `all-clients-ready`: Server → Clients (sent when all clients confirmed ready)

#### C. Modify Game Start Flow
- Server sends `game-init` with gameState (not `game-start`)
- Server waits for all `client-ready` events
- Server broadcasts `game-start` only after all clients ready

### 2. Client-Side Changes

#### A. New Hook: `useGameReady.ts`
```typescript
interface UseGameReadyResult {
  gameReady: boolean;
  validateGameReady: (gameState: GameState | null) => boolean;
}
```

**Validation Logic:**
- gameState exists
- playerNumber is set
- Current player has valid hand cards (length > 0)
- All required game data present

#### B. Modify `useGameStateSync.ts`
- Add `gameReady: boolean` state
- Add validation on gameState change
- Emit `client-ready` to server when ready
- Listen for `all-clients-ready` event

#### C. Modify `useLobbyState.ts`
- Add `allGamesReady: boolean` state
- Keep `isInLobby = true` until `allGamesReady = true`
- Listen for `all-clients-ready` event

#### D. Modify `useMultiplayerGame.ts`
- Add `gameReady: boolean` to return type
- Compose from `useGameStateSync` and `useLobbyState`

#### E. Update Navigation Logic
- Only navigate when: `isInLobby = false` AND `gameReady = true`
- Show loading state while waiting for all clients

### 3. UI Changes

#### A. Update Lobby Component
- Show "Waiting for all players to load..." when `allPlayersReady` but not `allGamesReady`
- Add loading indicator

#### B. Update Game Screen Navigation
- Guard navigation with `gameReady` check
- Show "Initializing game..." state if needed

## Files to Modify

### Server-Side:
1. `multiplayer/server/game/GameManager.js` - Add ready tracking
2. `multiplayer/server/services/RoomService.js` - Modify game start flow
3. `multiplayer/server/services/BroadcasterService.js` - Add ready events
4. `multiplayer/server/socket/handlers/index.js` - Handle client-ready event

### Client-Side:
1. `hooks/multiplayer/useGameReady.ts` - NEW: Game ready validation hook
2. `hooks/multiplayer/useGameStateSync.ts` - Add ready state tracking
3. `hooks/multiplayer/useLobbyState.ts` - Add allGamesReady state
4. `hooks/useMultiplayerGame.ts` - Expose gameReady
5. `components/lobby/Lobby.tsx` - Show ready waiting state
6. `app/online-play.tsx` - Update navigation logic

## Testing
1. Test 2-player game: Both clients load → Both send ready → Game starts
2. Test 4-player game: All 4 clients load → All send ready → Game starts
3. Test slow client: One client slow → Others wait → Game starts together
4. Test disconnection: Client disconnects during ready → Handle gracefully

## Benefits
✅ Prevents premature game navigation
✅ Ensures all players have initialized cards
✅ Better UX with clear loading states
✅ Eliminates race conditions
✅ Synchronized game start across all clients