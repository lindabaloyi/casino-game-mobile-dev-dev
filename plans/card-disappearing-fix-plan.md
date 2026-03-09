# Card Disappearing Fix - Incremental Plan

Based on the debugging document [`docs/card-disappearing-debug.md`](docs/card-disappearing-debug.md), here is the incremental plan to fix the card disappearing issue.

## Root Causes Identified

1. **High Severity**: Cards lost in `createTemp.js` when target card not found after first card removed
2. **Medium Severity**: No optimistic UI - card disappears before server confirmation
3. **Medium Severity**: Stale position data causes wrong target detection

---

## Fix 1: Transaction Rollback in createTemp.js (HIGH PRIORITY)

**Problem**: Cards disappear when target card is not found after the first card has already been removed from its source.

**Location**: [`shared/game/actions/createTemp.js`](shared/game/actions/createTemp.js) lines 87-89, 96-98, 116-118

**Solution**: Implement validation-first + rollback mechanism:
- Track removed cards for potential rollback
- Validate BOTH cards exist BEFORE removing
- Use try/catch with rollback on failure

**Enhanced Implementation**:
```javascript
function createTemp(state, payload, playerIndex) {
  const newState = cloneState(state);
  
  // Track removals for potential rollback
  const removed = [];
  
  try {
    // Step 1: Validate BOTH cards exist BEFORE removing anything
    const cardExists = findCardAnywhere(newState, card, playerIndex);
    const targetExists = findCardOnTable(newState, targetCard);
    
    if (!cardExists) {
      throw new Error('Card not found - may have already been moved');
    }
    if (!targetExists) {
      throw new Error('Target card not found on table');
    }
    
    // Step 2: Remove first card with tracking
    const firstCard = removeCardWithTracking(newState, card, playerIndex, removed);
    
    // Step 3: Validate target STILL exists after first removal
    const targetIdx = findCardOnTable(newState, targetCard);
    if (targetIdx === -1) {
      throw new Error('Target card was removed by another action');
    }
    
    // Step 4: Remove target card with tracking
    const targetCardObj = removeCardWithTracking(newState, targetCard, null, removed);
    
    // Step 5: Create temp stack...
    // ...
    
    return newState;
    
  } catch (error) {
    // Rollback: restore all removed cards
    restoreCards(newState, removed);
    throw error; // Re-throw so client gets feedback
  }
}
```

**Helper Functions Needed**:
- `findCardAnywhere()` - Find card in hand, table, or captures
- `findCardOnTable()` - Find card specifically on table
- `removeCardWithTracking()` - Remove card and track for rollback
- `restoreCards()` - Restore all removed cards to original locations

---

## Fix 2: Add Optimistic UI with Error Recovery (MEDIUM PRIORITY)

**Problem**: Card becomes invisible immediately on drop (opacity=0), but if server rejects the action, card is lost.

**Location**: [`components/table/DraggableTableCard.tsx`](components/table/DraggableTableCard.tsx)

**Solution (Simplified)**: Don't hide card immediately - add timeout as safety net:
1. Keep card visible during action processing
2. Add 5-second timeout to restore visibility as fallback
3. Don't implement full optimistic UI yet (defer complexity)

**Changes**:
```typescript
// In handleDrop - don't change opacity immediately
function handleDrop(absX: number, absY: number) {
  const stackHit = findTempStackAtPoint(absX, absY);
  if (stackHit) {
    // Don't hide - let server response handle visibility
    onDropOnStack(card, stackHit.stackId, stackHit.owner, stackHit.stackType);
    
    // Add timeout as safety net - restore after 5 seconds
    setTimeout(() => {
      if (opacity.value === 0) {
        console.log('[DraggableTableCard] Safety timeout - restoring card visibility');
        opacity.value = withSpring(1);
      }
    }, 5000);
    return;
  }
  // ...
}
```

**Why simplified?** Full optimistic UI adds complexity. The timeout alone solves the "stuck invisible" problem.

---

## Fix 3: Card Count Validation (MEDIUM PRIORITY)

**Problem**: No way to detect when cards are lost - desync goes unnoticed until visual bug appears.

**Location**: [`hooks/multiplayer/useGameStateSync.ts`](hooks/multiplayer/useGameStateSync.ts)

**Solution**: Track total card count and validate on every state update:
- Total = sum of (deck + all hands + all captures + table cards + pending actions)
- Should remain constant throughout game

**Changes**:
```typescript
// Add validation in useGameStateSync
useEffect(() => {
  if (gameState) {
    const expectedTotal = 52; // Standard deck
    const actualTotal = countAllCards(gameState);
    if (actualTotal !== expectedTotal) {
      console.error('Card count mismatch:', expectedTotal, 'vs', actualTotal);
      requestSync(); // Force state refresh
    }
  }
}, [gameState]);
```

---

## Fix 4: Position Registration Improvements (LOW-MEDIUM PRIORITY)

**Problem**: Card positions become stale, causing hit detection to target wrong cards.

**Location**: [`hooks/useDrag.ts`](hooks/useDrag.ts)

**Solution**:
1. Add debounced re-registration on any table change
2. Add position validation before hit detection
3. Use layoutVersion more aggressively

**Changes**:
```typescript
// Force re-registration on any state change
useEffect(() => {
  // Debounce to prevent excessive measurements
  const timeout = setTimeout(() => {
    reRegisterAllCards();
  }, 50);
  return () => clearTimeout(timeout);
}, [tableCards]);
```

---

## Fix 5: Hidden Card State Recovery (LOW PRIORITY)

**Problem**: Cards might remain hidden if opponent drag state isn't cleared properly.

**Location**: [`components/table/utils/cardVisibility.ts`](components/table/utils/cardVisibility.ts)

**Solution**: Add defensive cleanup and validation:
```typescript
// In useOpponentDrag
useEffect(() => {
  return () => {
    // Ensure drag state is cleared on unmount
    setOpponentDrag(null);
  };
}, []);

// Add validation in cardVisibility
useEffect(() => {
  if (opponentDrag && !opponentDrag.isDragging) {
    // Invalid state - clear it
    console.warn('Invalid opponent drag state');
  }
}, [opponentDrag]);
```

---

## Execution Order

### Sprint 1: Critical Fixes (Day 1)
```
1. Fix 1: Transaction rollback with restoration
   - Add removeCardWithTracking() helper
   - Add restoreCards() helper
   - Wrap createTemp in try/catch
   - Test: Card never lost even if target missing

2. Fix 3: Card count validation
   - Add validateCardInventory()
   - Call on every state update
   - Test: Console error if cards missing
```

### Sprint 2: Safety Nets (Day 2)
```
3. Fix 2 (Simplified): Visibility timeout only
   - Don't implement full optimistic UI yet
   - Just add 5-second timeout to restore visibility
   - Test: Cards never stuck invisible

4. Fix 3 (Enhanced): Add auto-sync on validation failure
   - If validation fails, request sync from server
   - Test: Game recovers automatically
```

### Sprint 3: Polish (Optional)
```
5. Fix 4: Position registration (if needed)
6. Fix 5: Hidden state recovery (if needed)
7. Fix 2 (Full): Optimistic UI (if UX improvement wanted)
```

---

## Estimated Timeline
- Fix 1 + Fix 3: **3-4 hours**
- Testing: **1 hour**
- Fix 2 (simplified): **1 hour**

**Total: ~1 day to fix the critical bug** ✅

| Fix | Complexity | Risk | Impact |
|-----|------------|------|--------|
| Fix 1: Transaction rollback | Medium | Low | High - prevents root cause |
| Fix 2: Optimistic UI | Low | Low | Medium - improves UX |
| Fix 3: Card validation | Low | Very Low | Medium - detects issues early |
| Fix 4: Position registration | Medium | Medium | Low - edge case improvement |
| Fix 5: Hidden state recovery | Low | Very Low | Low - defensive |

---

## Testing Plan

### Test 1: Transaction Rollback
1. Start game with 2 players
2. Drag hand card onto table card
3. Kill server during action (or simulate error)
4. Verify: Card returns to hand (not lost)

### Test 2: Card Count Validation
1. Play 5 random actions
2. Check console for validation errors
3. Verify: No "Card count mismatch" errors

### Test 3: Visibility Recovery
1. Drag card and hold for 10 seconds
2. Release without valid drop
3. Verify: Card becomes visible again

---

## Next Steps

1. **Approve this plan** - Confirm which fixes to implement
2. **Start with Fix 1** - Highest impact, addresses root cause
3. **Add Fix 3** - Provides validation to catch regressions
4. **Continue with remaining fixes** based on priority
