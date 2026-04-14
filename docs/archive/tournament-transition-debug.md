# Tournament Qualification Review - Next Phase Transition Issue

## Problem
After the qualification review modal displays scores and qualified players, the game pauses and does not advance to the next phase (SEMI_FINAL with 3 players).

## Expected Flow
1. Round ends → Server enters `QUALIFICATION_REVIEW` phase
2. Client shows `QualificationReviewModal` with countdown (10 seconds)
3. Countdown reaches 0 → `onCountdownComplete()` callback fires
4. Client sends `advanceFromQualificationReview` action to server
5. Server processes action → transitions to `SEMI_FINAL` or `FINAL_SHOWDOWN`
6. Server broadcasts new state with updated phase
7. Client receives update → hides modal, shows game for new phase

## Current Implementation

### Client Side (GameRoomContainer.tsx)
```tsx
<QualificationReviewModal
  onCountdownComplete={() => {
    console.log('[GameRoomContainer] Qualification countdown complete, advancing to next phase');
    sendAction({ type: 'advanceFromQualificationReview', payload: {} });
  }}
/>
```

### Action Routing (useGameStateSync.ts)
```tsx
const sendAction = useCallback((action) => {
  socket?.emit('game-action', action);
}, [socket]);
```

### Server Handler (GameCoordinatorService.js)
- Receives `game-action` event
- Calls `actionRouter.executeAction()` 
- Shared action router routes to `advanceFromQualificationReview.js`
- Server checks phase transition and broadcasts new state

## Potential Issues

### 1. Client-Side Issues
- [ ] `sendAction` may not be connected to socket (socket might be null/undefined)
- [ ] `onCountdownComplete` may fire multiple times (race condition)
- [ ] Client might not be listening for state updates after action

### 2. Server-Side Issues  
- [ ] Action may not be registered in the shared action router
- [ ] Server might not broadcast state update after phase transition
- [ ] Socket mapping might be lost during phase transition

### 3. Data Flow Issues
- [ ] `qualifiedPlayers` may be empty or incorrect when action executes
- [ ] Server state might not reflect QUALIFICATION_REVIEW when action processes
- [ ] Socket index remapping might fail, causing player to be disconnected

## Debug Steps

### Step 1: Verify client sends action
Add logs in `QualificationReviewModal.tsx`:
```tsx
onCountdownComplete={() => {
  console.log('[QualificationReviewModal] Countdown complete! Sending action...');
  onCountdownComplete?.();
}}
```

### Step 2: Verify socket receives action
Add logs in server `socket\handlers\index.js`:
```js
socket.on('game-action', data => {
  console.log('[Socket] Received game-action:', data.type);
  coordinator.handleGameAction(socket, data);
});
```

### Step 3: Verify server processes action
Add logs in `GameCoordinatorService.js` handleGameAction:
```js
console.log(`[Coordinator] handleGameAction - action: ${data.type}, playerIndex: ${playerIndex}`);
```

### Step 4: Verify action transitions state
Add logs in `advanceFromQualificationReview.js`:
```js
console.log(`[advanceFromQualificationReview] Current phase: ${newState.tournamentPhase}`);
console.log(`[advanceFromQualificationReview] Qualified players: ${JSON.stringify(newState.qualifiedPlayers)}`);
```

### Step 5: Verify server broadcasts
Check if `broadcastGameUpdate` is called after phase transition

### Step 6: Verify client receives update
Check if client socket listens for 'game-state' event and updates

## Most Likely Causes (Priority Order)

1. **Socket not connected when action fires** - If socket is null/undefined, action won't reach server
2. **Duplicate action calls** - Modal may call onCountdownComplete multiple times
3. **Server action not registered** - Ensure advanceFromQualificationReview is in shared/actions/index.js
4. **State broadcast fails** - Server might not broadcast after phase transition
5. **Player index remapping fails** - Socket mapping lost, causing player disconnect
