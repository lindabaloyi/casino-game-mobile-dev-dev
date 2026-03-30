# Android Optimistic UI Implementation - Status & Roadmap

## ✅ Completed (v1.0)

### Core Implementation
- **[`hooks/game/useOptimisticGameState.ts`](hooks/game/useOptimisticGameState.ts)** - Core optimistic state hook
  - Clone game state for mutations
  - Apply actions: trail, capture, createTemp, addToTemp, dropToCapture, stealBuild, acceptTemp, cancelTemp, endTurn
  - Track pending actions for rollback
  - Sync with server state

- **[`hooks/game/useGameComputed.ts`](hooks/game/useGameComputed.ts)** - Updated to use displayState
  - Now accepts optional optimisticState parameter
  - Computes values from displayState (optimistic or server)

- **[`hooks/game/useDragHandlers.ts`](hooks/game/useDragHandlers.ts)** - Integrated optimistic actions
  - Added applyOptimisticAction callback
  - Calls applyOptimisticAction on createTemp and addToTemp

- **[`components/game/GameBoard.tsx`](components/game/GameBoard.tsx)** - Wired optimistic state
  - Uses displayState = optimisticState || gameState
  - Passes applyOptimisticAction to drag handlers

- **[`hooks/drag/useDragOverlay.ts`](hooks/drag/useDragOverlay.ts)** - Added performance logging
  - Logs when moveDrag exceeds 16ms (60fps budget)

- **[`hooks/game/useDragHandlers.ts`](hooks/game/useDragHandlers.ts)** - Added performance logging
  - Logs drag handler performance

---

## 🔧 Issues to Address (v1.1+)

### 1. Type Mismatches
- `tableCards` type differs between server and optimistic state
- Need: Unified type definitions or use loose `any[]` type

### 2. Incomplete Optimistic Coverage
These actions need optimistic updates:
| Action | Where Called | Optimistic Update Needed |
|--------|--------------|--------------------------|
| Drop on opponent build | handleDropOnStack | stealBuild |
| Accept temp stack | handleAcceptClick | acceptTemp |
| Cancel temp stack | actions.cancelTemp | cancelTemp |
| Drop whole stack | handleDropBuildToCapture | dropToCapture |
| Recall (Shiya) | handleRecallAttempt | recall |
| Set build value | handleConfirmTempBuild | setTempBuildValue |
| Drag from captured | handleCapturedCardDragEnd | createTemp/addToTemp |
| Capture build | handleCaptureBuild | stackDrop (build_stack) |

### 3. No Rollback on Server Errors
- Server rejections not handled
- Need: Error handling that calls rollback()

### 4. Improve Sync Logic
- Hand-length comparison is unreliable
- Need: Version-based sync or reapply pending on server update

### 5. Performance
- Deep clone on every action is heavy
- Consider: Selective cloning, immer, or mutable updates

---

## 📋 Next Steps (Priority Order)

### P0 - Critical (Must Fix)
1. **Fix TypeScript errors** - Ensure build compiles
2. **Add captured card drag optimistic updates** - handleCapturedCardDragEnd, handleCaptureBuild

### P1 - High Impact
3. **Add stealBuild optimistic update** - handleDropOnStack for opponent builds
4. **Add acceptTemp/cancelTemp optimistic** - action buttons in PlayerHandArea

### P2 - Important
5. **Add rollback on server error** - Listen for error events, call rollback()
6. **Improve sync logic** - Use version comparison instead of hand-length

### P3 - Nice to Have
7. **Performance: Selective cloning** - Only clone modified branches
8. **Performance: Memoization** - Memoize computed values from displayState

---

## 🧪 Testing Checklist

- [ ] Test trail - card should disappear from hand immediately
- [ ] Test createTemp - card should move to table immediately
- [ ] Test addToTemp - card should join stack immediately
- [ ] Test captured card drag - card should move from captures immediately
- [ ] Test server rejection - state should rollback
- [ ] Test multiple actions in sequence - all should apply optimistically
- [ ] Test on Android device - verify <16ms frame time

---

## 📝 Key Files

```
hooks/game/useOptimisticGameState.ts  - Core optimistic state hook
hooks/game/useGameComputed.ts         - Computed values (updated for displayState)
hooks/game/useDragHandlers.ts         - Drag handlers with optimistic calls
components/game/GameBoard.tsx        - Main game board (wired optimistic state)
hooks/drag/useDragOverlay.ts          - Drag overlay (performance logging added)
```

---

## 📖 Architecture

```
Server GameState
       ↓
useOptimisticGameState(gameState)
       ↓
optimisticState (cloned, mutated immediately)
       ↓
displayState = optimisticState || gameState
       ↓
useGameComputed(displayState, playerNumber)
       ↓
UI Components (PlayerHandArea, TableArea, etc.)
```

The key insight: UI uses `displayState` which prioritizes optimistic state when available.
