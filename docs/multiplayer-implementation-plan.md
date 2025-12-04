# Multiplayer Casino Game Implementation Plan

## Overview

This plan provides step-by-step instructions to fix the "sharedGameLogic.determineActions is not a function" error and implement the recommended simplified server-centric architecture for the casino multiplayer game.

## Current Status

**Immediate Issue**: Client attempts to call `sharedGameLogic.determineActions()` but the React Native bundler loads `shared-game-logic.ts` (which doesn't export this function) instead of `shared-game-logic.js` (which does).

**Files Involved**:
- `components/GameBoard.tsx` - Client code calling determineActions
- `multiplayer/server/game-logic/shared-game-logic.js` - Has determineActions
- `multiplayer/server/game-logic/shared-game-logic.ts` - Missing determineActions
- `multiplayer/server/index.js` - Server socket handlers
- `multiplayer/server/game-logic/game-actions.js` - Individual action handlers

## Phase 1: Immediate Fix (Stop the Error)

### Step 1.1: Sync TypeScript and JavaScript Modules

**Problem**: `.ts` and `.js` files are out of sync. React Native loads `.ts`, which missing the function.

**Solution**: Copy `determineActions` function from `.js` to `.ts` file.

```typescript
// In shared-game-logic.ts
export function determineActions(draggedItem: any, targetInfo: any, gameState: GameState): any {
  // Copy entire function implementation from shared-game-logic.js
  // ... (full implementation here)
}

// Export existing functions plus determineActions
export {
  initializeGame,
  validateGameState,
  determineActions, // Add this
  // ... other exports
};
```

**Files to Modify**:
- `multiplayer/server/game-logic/shared-game-logic.ts`

**Expected Result**: Client can call `determineActions()` successfully, error stops.

### Step 1.2: Test Fix

1. Start Metro bundler
2. Load multiplayer game
3. Attempt to drop a card
4. Verify no "determineActions is not a function" error
5. Verify basic card dropping works

---

## Phase 2: Short-term Simplification (Remove Client Logic)

### Step 2.1: Create Server Card-Drop Handler

**Goal**: Move action determination entirely to server-side.

**New Code in `multiplayer/server/index.js`**:

```javascript
// Import determineActions at top
const { determineActions } = require('./game-logic/shared-game-logic.js');

// Add after existing socket handlers
socket.on('card-drop', (data) => {
  console.log(`[SERVER] Card drop:`, data);
  if (!gameState) return socket.emit('error', { message: 'No active game' });

  const playerIndex = activeGameSockets.findIndex(p => p.id === socket.id);
  if (playerIndex !== gameState.currentPlayer) {
    return socket.emit('error', { message: "Not your turn" });
  }

  try {
    // Use existing determineActions function
    const result = determineActions(data.draggedItem, data.targetInfo, gameState);

    if (result.errorMessage) {
      return socket.emit('error', { message: result.errorMessage });
    }

    if (result.actions.length === 1 && !result.requiresModal) {
      // Execute single action automatically
      const newState = executeAction(gameState, result.actions[0], playerIndex);
      gameState = newState;
      io.emit('game-update', gameState);
    } else {
      // Send choices to client
      socket.emit('action-choices', {
        requestId: data.requestId,
        actions: result.actions
      });
    }
  } catch (error) {
    console.error('[SERVER] Card drop error:', error);
    socket.emit('error', { message: 'Invalid move' });
  }
});

// Handle user's action choice
socket.on('execute-action', (data) => {
  const playerIndex = activeGameSockets.findIndex(p => p.id === socket.id);
  if (playerIndex !== gameState.currentPlayer) {
    return socket.emit('error', { message: "Not your turn" });
  }

  try {
    const newState = executeAction(gameState, data.action, playerIndex);
    gameState = newState;
    io.emit('game-update', gameState);
  } catch (error) {
    socket.emit('error', { message: 'Action failed' });
  }
});

// Helper function to execute actions
function executeAction(gameState, action, playerIndex) {
  switch (action.type) {
    case 'trail':
      // Implement trail logic (move from existing handler)
      return handleTrail(gameState, action.payload.card);
    case 'capture':
      return handleCapture(gameState, action.payload.draggedItem, action.payload.selectedTableCards);
    case 'build':
      return handleBuild(gameState, action);
    // ... other action types
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
```

### Step 2.2: Update Client GameBoard Component

**Remove from `components/GameBoard.tsx`**:
- `import sharedGameLogic` line
- `determineActions` calls in `handleDropOnCard`
- Immediate action execution logic (sendAction calls)
- All modal logic based on determineActions result

**Add to `components/GameBoard.tsx`**:

```typescript
// In handleDropOnCard - replace entire function
const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
  console.log(`[GameBoard] Card dropped on target:`, targetInfo.type);

  if (!isMyTurn) {
    setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
    return false;
  }

  // Send raw drop event to server
  sendAction({
    type: 'card-drop',
    payload: {
      draggedItem,
      targetInfo,
      requestId: Date.now() // For matching responses
    }
  });

  return true;
}, [isMyTurn, sendAction]);

// Add action-choices handler in useEffect or useSocket hook
useEffect(() => {
  const socket = getSocket(); // Access socket instance

  const handleActionChoices = (data: any) => {
    const actions = data.actions.map(action => ({
      type: action.type,
      label: action.label,
      payload: action.payload
    }));

    setModalInfo({
      title: 'Choose Your Action',
      message: 'What would you like to do?',
      actions
    });
  };

  socket.on('action-choices', handleActionChoices);

  return () => {
    socket.off('action-choices', handleActionChoices);
  };
}, []);
```

**Update modal action handler**:
```typescript
const handleModalAction = useCallback((action: any) => {
  console.log(`[GameBoard] User selected action:`, action);
  sendAction({
    type: 'execute-action',
    payload: {
      action,
      requestId: modalInfo?.requestId
    }
  });
  setModalInfo(null);
}, [sendAction, modalInfo?.requestId]);
```

### Step 2.3: Remove Shared Logic Import

**File**: `components/GameBoard.tsx`
**Action**: Delete this line:
```typescript
const sharedGameLogic = require('../multiplayer/server/game-logic/shared-game-logic');
```

### Step 2.4: Test Phase 2 Changes

1. Start both client and server
2. Drop cards in various scenarios:
   - Trail (should work automatically)
   - Capture (should work automatically)
   - Build (should show modal with choices)
3. Verify no client-side determineActions calls
4. Verify server handles all logic

---

## Phase 3: Long-term Consolidation (Clean Architecture)

### Step 3.1: Consolidate Server Game Logic

**Create**: `multiplayer/server/game-logic/determine-actions.js`

Move the `determineActions` function from `shared-game-logic.js` to this dedicated file:

```javascript
// determine-actions.js
const { rankValue, calculateCardSum } = require('./shared-game-logic.js');

function determineActions(draggedItem, targetInfo, gameState) {
  // Move entire implementation from shared-game-logic.js
}

module.exports = { determineActions };
```

**Update server imports**:
```javascript
// In index.js
const { determineActions } = require('./game-logic/determine-actions.js');
```

### Step 3.2: Remove Client References to Server Paths

**Audit all imports**: Search for any client files importing server-side modules:

```bash
grep -r "multiplayer/server" components/ hooks/ app/
```

Remove any remaining cross-boundary imports.

### Step 3.3: Add Comprehensive Error Handling

**Server**: Add validation for all action types

**Client**: Add loading states during server processing

```typescript
// In GameBoard.tsx
const [isProcessingDrop, setIsProcessingDrop] = useState(false);

const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
  if (!isMyTurn || isProcessingDrop) return false;

  setIsProcessingDrop(true);

  sendAction({
    type: 'card-drop',
    payload: { draggedItem, targetInfo }
  });

  // Reset after server responds or timeout
  setTimeout(() => setIsProcessingDrop(false), 5000);
}, [isMyTurn, isProcessingDrop, sendAction]);
```

### Step 3.4: Performance Optimization

1. **Add action caching**: Cache recent valid actions per player
2. **Debounce rapid drops**: Prevent spam dropping
3. **Compress game state**: Send diffs instead of full state

---

## Phase 4: Testing and Validation

### Test Scenarios

1. **Basic Trail**: Drop card on empty table
2. **Single Capture**: Drop matching rank card
3. **Build Creation**: Drop hand card on loose card
4. **Build Extension**: Drop on opponent's build
5. **Modal Choices**: Scenarios requiring user selection
6. **Error Handling**: Invalid moves, wrong turn, etc.

### Testing Checklist

- [ ] All card drop scenarios work
- [ ] No client-side game logic
- [ ] Server validates all actions
- [ ] Modal system works for choices
- [ ] Error messages display properly
- [ ] Network disconnects handled
- [ ] Performance acceptable

### Rollback Plan

**If issues arise**: Keep client-side determineActions as backup:

```typescript
// Feature flag in GameBoard.tsx
const USE_SERVER_LOGIC = process.env.NODE_ENV === 'production';

if (USE_SERVER_LOGIC) {
  // New server-only logic
} else {
  // Existing determineActions logic
}
```

---

## Migration Timeline

**Week 1**: Phase 1 (Fix immediate error)
- Sync .ts and .js files
- Test error resolution

**Week 2**: Phase 2 (Server-centric logic)
- Implement card-drop handler
- Update client to use server logic
- Remove client determineActions

**Week 3**: Phase 3 (Architecture cleanup)
- Consolidate server files
- Add error handling and performance optimizations

**Week 4**: Testing and production deployment

## Success Metrics

- ✅ No more "determineActions is not a function" errors
- ✅ Client codebase simplified (removed ~200 lines game logic)
- ✅ All game mechanics work (trail, capture, build)
- ✅ Server response time < 500ms for actions
- ✅ No client/server logic inconsistencies

## Rollback Points

1. **After Phase 1**: Can revert to original if sync causes issues
2. **After Phase 2**: Quick rollback by re-enabling client determineActions
3. **After Phase 3**: Modular changes, easy to isolate

This plan transforms the architecture from complex shared logic to simple server-centric design while fixing the current error.
