# Hand-to-Table Drop Registration Issue

## Executive Summary

**Issue:** Hand-to-table drops are detected on the client-side but temporary stacks are not being created on the server-side. The drop "handles" but the temp stack registration fails.

**Root Cause:** The system uses two separate staging handlers instead of the unified `createStagingStack` logic:
- Hand-to-table: Uses old `handToTableDrop.js` with problematic card sorting
- Table-to-table: Uses new unified `createStagingStack.js` with correct drop order

**Impact:** Hand-to-table staging doesn't work, cards appear to get "stuck" after drop.

---

## Detailed Problem Analysis

### Current Architecture (Broken)

The casino game has **two separate code paths** for creating temporary stacks:

#### 1. Hand-to-Table Drops (BROKEN)
**Client Action:** Sends `handToTableDrop` action
**Server Handler:** `handToTableDrop.js` (old logic)
**Issues:**
- Uses `orderCardsBigToSmall()` function that sorts cards by value
- Manual table card removal and re-insertion logic
- Not integrated with unified staging system

#### 2. Table-to-Table Drops (WORKING)
**Client Action:** Sends `createStagingStack` action
**Server Handler:** `createStagingStack.js` (unified logic)
**Benefits:**
- Preserves drop order (target first, dragged second)
- Integrated validation and error handling
- Consistent with all other staging operations

### Code Evidence

#### Action Routing (socket-server.js)
```javascript
// Action type mapping - PROBLEM: Different handlers for similar operations
const actionTypeMapping = {
  // ❌ Hand-to-table uses OLD handler
  handToTableDrop: actionHandlers.handleHandToTableDrop,

  // ✅ Table-to-table uses NEW unified handler
  createStagingStack: actionHandlers.handleCreateStagingStack,

  // ... other actions
};
```

#### Hand-to-Table Handler (handToTableDrop.js - PROBLEMATIC)
```javascript
// ❌ SORTS CARDS BY VALUE INSTEAD OF PRESERVING DROP ORDER
const { orderCardsBigToSmall } = require('../GameState');
const [bottomCard, topCard] = orderCardsBigToSmall(targetInfo.card, draggedItem.card);

// ❌ MANUAL TABLE MANAGEMENT (error-prone)
const targetCardIndex = gameState.tableCards.findIndex(card =>
  card.rank === targetInfo.card.rank && card.suit === targetInfo.card.suit
);

if (targetCardIndex >= 0) {
  gameState.tableCards.splice(targetCardIndex, 1); // Remove target
}

// ❌ CREATES STACK WITH SORTED ORDER
const tempStack = {
  type: 'temporary_stack',
  stackId: stackId,
  cards: [bottomCard, topCard], // WRONG: Sorted by value, not drop order
  owner: playerIndex,
  value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
};

gameState.tableCards.push(tempStack); // Add back to table
```

#### Unified Handler (createStagingStack.js - CORRECT)
```javascript
// ✅ PRESERVES DROP ORDER (target first, dragged second)
cards: [
  { ...targetCard, source: 'table' }, // Bottom card first (target)
  { ...draggedCard, source }          // Top card second (dragged)
],

// ✅ INTEGRATED VALIDATION
// Checks for existing staging stacks, validates sources, etc.

// ✅ UNIFIED ERROR HANDLING
// Consistent logging and error responses
```

### Client-Side Drop Detection (WORKING)

The client-side correctly detects hand-to-table drops:

#### DraggableCard.tsx (Client Drop Detection)
```typescript
// ✅ Correctly hits table card zones
if (dropPosition.x >= x && dropPosition.x <= x + width &&
    dropPosition.y >= y && dropPosition.y <= y + height) {

  // ✅ Sends correct action type
  const draggedItem = {
    card,
    source: 'hand',  // Correct source
    player: currentPlayer,
    stackId: stackId || undefined
  };

  // ✅ Calls server with proper payload
  const dropResult = bestZone.onDrop(draggedItem);
  // dropResult.type === 'loose', dropResult.card === targetCard
}
```

#### TableDraggableCard.tsx (Drop Zone Handler)
```typescript
// ✅ Correctly registers drop zones for table cards
const dropZone = {
  stackId: zoneId,
  priority: DROP_ZONE_PRIORITIES.LOOSE_CARD, // 100
  bounds: expandedBounds,
  onDrop: (draggedItem: any) => {
    return {
      type: 'loose',
      card,        // Target table card
      index: index,
      draggedSource: draggedItem.source, // 'hand'
      targetType: 'table',
      targetArea: 'loose'
    };
  }
};
```

### Server-Side Action Processing (BROKEN)

The issue occurs in the server-side action routing:

#### ActionRouter.js (Registration)
```javascript
// Actions are registered correctly
actionRouter.registerAction('handToTableDrop', handleHandToTableDrop);
actionRouter.registerAction('createStagingStack', handleCreateStagingStack);
```

#### Action Execution Flow
```
Client sends: handToTableDrop action
↓
ActionRouter routes to: handleHandToTableDrop (OLD)
↓
handleHandToTableDrop sorts cards by value ❌
↓
Temp stack created with wrong order ❌
↓
Client receives updated game state but stack appears "broken" ❌
```

### Impact Analysis

#### User Experience Issues
1. **Cards appear "stuck"** - Drop is detected but temp stack doesn't form properly
2. **Inconsistent behavior** - Table-to-table works, hand-to-table doesn't
3. **Confusing visual feedback** - Cards snap back or behave unexpectedly

#### Technical Issues
1. **Code duplication** - Two separate staging implementations
2. **Maintenance burden** - Changes need to be made in multiple places
3. **Inconsistent validation** - Different error handling approaches
4. **Card ordering confusion** - Some stacks sort by value, others preserve drop order

---

## Proposed Solution

### Architecture Changes

#### Option 1: Change Action Type (Recommended)
**Update client to send unified action type:**
```typescript
// Client sends 'createStagingStack' instead of 'handToTableDrop'
// Server uses unified handler for all staging operations
```

**Pros:**
- Single code path for all staging
- Consistent validation and error handling
- Easier maintenance

**Cons:**
- Requires client changes
- Action type naming might be confusing

#### Option 2: Change Server Routing
**Update server to use unified handler:**
```javascript
// socket-server.js
const actionTypeMapping = {
  handToTableDrop: actionHandlers.handleCreateStagingStack, // ✅ Use unified
  createStagingStack: actionHandlers.handleCreateStagingStack,
  // ... other mappings
};
```

**Pros:**
- No client changes required
- Immediate fix

**Cons:**
- Action type name doesn't match handler name
- Potential confusion in debugging

### Implementation Steps

#### Phase 1: Update Server Routing
1. Modify `socket-server.js` to route `handToTableDrop` to `handleCreateStagingStack`
2. Test hand-to-table drops work with unified logic
3. Verify table-to-table drops still work

#### Phase 2: Remove Old Handler
1. Delete `handToTableDrop.js` (after confirming unified handler works)
2. Update any documentation references
3. Clean up imports in `actions/index.js`

#### Phase 3: Testing & Validation
1. Test all staging scenarios:
   - Hand-to-table ✅
   - Table-to-table ✅
   - Multi-card staging ✅
2. Verify card ordering is preserved (drop order, not value order)
3. Confirm error handling is consistent

### Code Changes Required

#### socket-server.js
```diff
const actionTypeMapping = {
- handToTableDrop: actionHandlers.handleHandToTableDrop,
+ handToTableDrop: actionHandlers.handleCreateStagingStack,
  createStagingStack: actionHandlers.handleCreateStagingStack,
  // ... other actions remain unchanged
};
```

#### actions/index.js (Optional cleanup)
```diff
- const handleHandToTableDrop = require('./handToTableDrop');
- const handleCreateBuildWithValue = require('./createBuildWithValue');

module.exports = {
- handleHandToTableDrop,
  handleCreateStagingStack,
  handleCreateBuildWithValue,
  // ... other exports
};
```

### Expected Results

#### After Fix
- **Hand-to-table drops** create temp stacks with correct card order
- **No more "stuck" cards** after drops
- **Consistent behavior** across all staging operations
- **Unified codebase** with single staging implementation

#### Card Ordering
**Before (Broken):**
- Drag 5♠ onto 10♣ → Stack shows [10♣, 5♠] (sorted by value)

**After (Fixed):**
- Drag 5♠ onto 10♣ → Stack shows [10♣, 5♠] (drop order: target bottom, dragged top)

---

## Testing Checklist

### Functional Tests
- [ ] Hand card dropped on table card creates temp stack
- [ ] Temp stack shows correct card order (target bottom, dragged top)
- [ ] Temp stack allows adding more cards
- [ ] Temp stack can be finalized or cancelled
- [ ] Table-to-table drops still work correctly

### Edge Cases
- [ ] Multiple hand-to-table drops in sequence
- [ ] Hand-to-table after table-to-table operations
- [ ] Error handling for invalid drops
- [ ] Network interruptions during staging

### Performance Tests
- [ ] No performance degradation with unified handler
- [ ] Memory usage remains stable
- [ ] Server response times acceptable

---

## Risk Assessment

### Low Risk
- **Unified logic** - Using proven, tested code path
- **Backward compatibility** - Action types remain the same
- **Rollback plan** - Can revert routing change easily

### Mitigation Strategies
1. **Feature flag** - Can enable/disable unified routing
2. **Gradual rollout** - Test with subset of games first
3. **Monitoring** - Log staging operations for issues

---

## Conclusion

**The hand-to-table drop registration issue is caused by using separate staging handlers instead of the unified `createStagingStack` logic.** By routing hand-to-table drops to use the same handler as table-to-table drops, we ensure:

1. **Consistent card ordering** (drop order preserved)
2. **Unified validation** (same rules for all staging)
3. **Proper temp stack creation** (no more "stuck" cards)
4. **Maintainable codebase** (single implementation to maintain)

**Recommended action:** Update server routing to use `handleCreateStagingStack` for `handToTableDrop` actions, then remove the old `handToTableDrop.js` handler.

---

## References

- **Files affected:**
  - `multiplayer/server/socket-server.js` (action routing)
  - `multiplayer/server/game/actions/handToTableDrop.js` (old handler - to be removed)
  - `multiplayer/server/game/actions/createStagingStack.js` (unified handler)
  - `multiplayer/server/game/actions/index.js` (handler exports)

- **Related components:**
  - `components/DraggableCard.tsx` (client drop detection)
  - `components/table/TableDraggableCard.tsx` (drop zone registration)
  - `hooks/useDropResolver.ts` (drop resolution logic)

- **Test scenarios:**
  - Hand-to-table staging creation
  - Table-to-table staging creation
  - Multi-card temp stack operations
  - Staging finalization and cancellation
