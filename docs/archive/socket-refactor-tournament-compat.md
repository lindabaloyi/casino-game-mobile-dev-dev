# Tournament Qualification Review - Issue Analysis

## TL;DR

**ACTION LOGIC IS CORRECT** - Unit tests prove the server-side transition works. The issue is client-side or network-level.

---

## Test Results

```
✓ transitions from QUALIFICATION_REVIEW (3 qualified) to SEMI_FINAL
✓ transitions from QUALIFICATION_REVIEW (2 qualified) to FINAL_SHOWDOWN  
✓ does nothing if phase is not QUALIFICATION_REVIEW
✓ uses fallback when qualifiedPlayers is empty
```

## Where to Debug Now

### Priority 1: Client-side - Countdown callback firing

In `components/lobby/GameRoomContainer.tsx`, add logs:

```typescript
onCountdownComplete={() => {
  console.log('[DEBUG] Countdown complete!');
  console.log('[DEBUG] sendAction exists:', typeof sendAction);
  console.log('[DEBUG] isConnected:', isConnected);
  sendAction({ type: 'advanceFromQualificationReview', payload: {} });
}}
```

### Priority 2: Server-side - Action received

In `multiplayer/server/socket/handlers/index.js`:

```javascript
socket.on('game-action', data => {
  console.log('[Socket] Received game-action:', data.type);
  coordinator.handleGameAction(socket, data);
});
```

### Priority 3: Server-side - State broadcast

In `multiplayer/server/services/GameCoordinatorService.js`, after line 191:

```javascript
// After broadcasting
console.log('[Coordinator] Broadcast complete, new phase:', newState.tournamentPhase);
```

### Priority 4: Client-side - State received

In `hooks/multiplayer/useGameStateSync.ts`, in the game-update handler:

```typescript
socket.on('game-update', (state) => {
  console.log('[useGameStateSync] Received state, tournamentPhase:', state.tournamentPhase);
  setGameState(state);
});
```

## Quick Test Checklist

| Step | Check | Expected |
|------|-------|----------|
| 1 | `[DEBUG] Countdown complete!` appears | Yes |
| 2 | `[Socket] Received game-action: advanceFromQualificationReview` | Yes |
| 3 | `[advanceFromQualificationReview] Advancing to SEMI_FINAL` | Yes |
| 4 | `[useGameStateSync] Received state, tournamentPhase: SEMI_FINAL` | Yes |

---

## Conclusion

The server-side action logic works correctly. Run the tournament and check the console logs in this order to identify where the flow breaks.

After analyzing the codebase, the socket refactor to use a centralized `SocketManager` singleton **should be compatible** with tournament mode. The implementation correctly handles tournament queue joining and game state synchronization.

However, there are several potential issues that could cause the qualification review modal to not advance to the next phase. This document details the findings.

## Socket Architecture Analysis

### Current Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                     SocketManager (Singleton)                   │
│  - Single Socket.IO connection across app                       │
│  - Shared by all screens via useSocketConnection hook           │
│  - Manages connection state, reconnection                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   useSocketConnection({ mode: 'tournament' })
          │
          ▼
   useGameStateSync(socket)
          │
          ▼
   useOnlinePlayConnection → GameRoomContainer → QualificationReviewModal
```

### Key Flow for Tournament Mode

1. **Queue Joining** (`useSocketConnection.ts:120-123`)
   ```typescript
   if (mode === 'tournament') {
     sock.emit('join-tournament-queue');
   }
   ```

2. **Server Matchmaking** (`socket/handlers/index.js:103-112`)
   ```javascript
   socket.on('join-tournament-queue', async () => {
     const result = unifiedMatchmaking.addToQueue(socket, 'tournament');
     await broadcaster.broadcastTournamentGameStart(result);
   });
   ```

3. **Game State Sync** (`useGameStateSync.ts:411`)
   ```typescript
   socket.on('game-update', handleGameUpdate);
   ```

4. **Action Sending** (`useGameStateSync.ts:527-529`)
   ```typescript
   const sendAction = useCallback((action) => {
     socket?.emit('game-action', action);
   }, [socket]);
   ```

## Potential Issues Found

### 1. ✅ Socket Connection - Compatible
The `SocketManager` singleton correctly:
- Creates single socket connection that persists across navigation
- Uses `forceNew: false` to reuse existing connection
- Properly notifies listeners on connection state changes

### 2. ✅ Tournament Queue Joining - Compatible  
The `useSocketConnection` hook correctly emits `join-tournament-queue` for tournament mode.

### 3. ⚠️ Race Condition in setupSocket (Potential Issue)
In `useSocketConnection.ts:65-155`, there's a **200ms delay** before joining queues:

```typescript
setTimeout(() => {
  if (mode === 'tournament') {
    sock.emit('join-tournament-queue');
  }
}, 200);
```

**Problem**: If the socket setup happens after the component mounts but before authentication completes, the tournament queue join might fail or be ignored.

### 4. ⚠️ Duplicate Code in setupSocket
There are **duplicate queue join blocks** (lines 83-124 AND 126-154):

```typescript
// First block (lines 83-124)
if (mode === 'tournament') {
  sock.emit('join-tournament-queue');
}

// Second block (lines 150-154) - DUPLICATE!
if (mode === 'tournament') {
  sock.emit('join-tournament-queue');
}
```

This isn't a bug but indicates code that should be cleaned up.

### 5. ⚠️ sendAction Called with Null Socket (Most Likely Issue)
In `useGameStateSync.ts:527-529`:

```typescript
const sendAction = useCallback((action) => {
  socket?.emit('game-action', action);
}, [socket]);
```

**Problem**: If `socket` is `null` at the time `onCountdownComplete` fires, the action will **silently fail** because of the `?.` operator.

### 6. ✅ SocketManager Null Handling
The `getSocket()` returns a Promise, but `getCurrentSocket()` can return `null`:

```typescript
export function getCurrentSocket(): Socket | null {
  return socketInstance;
}
```

The code uses optional chaining (`socket?.emit`) which handles this correctly.

## Debug Recommendations

### Step 1: Verify Socket Connection
Add logs to confirm tournament mode socket is connected:

```typescript
// In useSocketConnection
console.log('[useSocketConnection] Tournament mode, socket connected:', isConnected);
```

### Step 2: Verify Action Reaches Server
Add logs in `QualificationReviewModal`:

```typescript
onCountdownComplete={() => {
  console.log('[QualificationReviewModal] Countdown complete! Sending action...');
  sendAction({ type: 'advanceFromQualificationReview', payload: {} });
}}
```

### Step 3: Verify Server Receives Action
Add logs in server `socket/handlers/index.js`:

```javascript
socket.on('game-action', data => {
  console.log('[Socket] Received game-action:', data.type);
  coordinator.handleGameAction(socket, data);
});
```

### Step 4: Verify State Broadcast
Check if client receives `game-update` after action:

```typescript
// In useGameStateSync
socket.on('game-update', (state) => {
  console.log('[useGameStateSync] Received game-update, tournamentPhase:', state.tournamentPhase);
});
```

## Root Cause Analysis

The most likely cause of the issue is:

**The action `advanceFromQualificationReview` is NOT being sent to the server**, OR the server is NOT broadcasting the new state back to clients after the phase transition.

### Possible Scenarios:

1. **Socket null when action fires**:
   - The `onCountdownComplete` callback fires
   - `sendAction` is called but `socket` is `null`
   - Action silently fails (`socket?.emit()` does nothing)

2. **Server doesn't broadcast after transition**:
   - Action reaches server
   - Server transitions state to SEMI_FINAL
   - Server fails to broadcast update to clients
   - Client stays in QUALIFICATION_REVIEW

3. **Player index remapping causes disconnect**:
   - Server attempts to remap player indices
   - Socket mapping is lost
   - Client disconnects or stops receiving updates

### 7. ✅ Server Action Registration - Verified as Working
The action `advanceFromQualificationReview` IS registered in `shared/game/actions/index.js:59`:

```javascript
advanceFromQualificationReview: require('./advanceFromQualificationReview'),
```

The server correctly routes actions via `socket/handlers/index.js:198`:
```javascript
socket.on('game-action', data => coordinator.handleGameAction(socket, data));
```

## Debug Logs to Add
Add comprehensive logs at each step of the flow to identify where it breaks.

### Fix 2: Verify socket is not null before action
In `GameRoomContainer.tsx`, verify `sendAction` is functional:

```typescript
onCountdownComplete={() => {
  console.log('[GameRoomContainer] sendAction exists:', typeof sendAction);
  console.log('[GameRoomContainer] socket connected:', isConnected);
  sendAction({ type: 'advanceFromQualificationReview', payload: {} });
}}
```

### Fix 3: Ensure server broadcasts after phase transition
In `GameCoordinatorService.js`, verify `broadcastGameUpdate` is called after `handleRoundTransition`:

```javascript
if (oldTournamentPhase === 'QUALIFICATION_REVIEW' && 
    (newPhase === 'SEMI_FINAL' || newPhase === 'FINAL_SHOWDOWN')) {
  console.log(`[Coordinator] Tournament phase transition: ${oldTournamentPhase} -> ${newPhase}`);
  // ... remap logic ...
}

// CRITICAL: Ensure this always runs
this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
```

## Conclusion

The socket refactor **architecture is sound** for tournament mode. The issue is likely in:

1. **Socket state** at the time `onCountdownComplete` fires (socket might be null/disconnected)
2. **Server broadcasting** (new state not sent to clients after transition)
3. **Player index remapping** (socket mapping lost, causing client disconnect)

## Debug Logs to Add

### Server Side - socket/handlers/index.js
```javascript
socket.on('game-action', data => {
  console.log('[Socket] Received game-action:', data.type, 'from socket:', socket.id);
  coordinator.handleGameAction(socket, data);
});
```

### Server Side - advanceFromQualificationReview.js
```javascript
function advanceFromQualificationReview(state) {
  console.log('[advanceFromQualificationReview] Called, current phase:', state.tournamentPhase);
  console.log('[advanceFromQualificationReview] Qualified players:', state.qualifiedPlayers);
  // ... rest of function
}
```

### Server Side - GameCoordinatorService.js (after phase transition)
```javascript
// After handling phase transition
console.log('[Coordinator] Broadcasting new state, phase:', newState.tournamentPhase);
this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
```

### Client Side - GameRoomContainer.tsx
```typescript
onCountdownComplete={() => {
  console.log('[GameRoomContainer] Countdown complete, sending advanceFromQualificationReview');
  console.log('[GameRoomContainer] Socket connected:', isConnected);
  sendAction({ type: 'advanceFromQualificationReview', payload: {} });
}}
```

### Client Side - useGameStateSync.ts
```typescript
socket.on('game-update', (state) => {
  console.log('[useGameStateSync] game-update received, phase:', state.tournamentPhase);
  setGameState(state);
});
```

---

## Updated: Most Likely Root Causes (Refined)

| Priority | Issue | Fix |
|----------|-------|-----|
| **#1** | Socket null when callback fires | Add logs to verify `sendAction` works |
| **#2** | Server doesn't broadcast after transition | Add logs to verify `broadcastGameUpdate` called |
| **#3** | Action doesn't reach server | Add logs to verify server receives `game-action` |

## Quick Test Checklist

1. ✅ Start tournament game with 4 players
2. ✅ Complete round 1 (QUALIFYING ends)
3. ✅ Wait for qualification review modal to appear
4. ⬜ Check console for `[Socket] Received game-action: advanceFromQualificationReview`
5. ⬜ Check console for `[advanceFromQualificationReview] Advancing to SEMI_FINAL`
6. ⬜ Check console for `[useGameStateSync] game-update received, phase: SEMI_FINAL`
7. ⬜ Verify modal closes and game starts with 3 players
