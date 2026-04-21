# Temp Stack Alteration Issue During Drag

## Problem

When a player drags a temp stack, the opponent's ghost stack shows different cards or altered state compared to what the active player sees. The temp stack gets modified during the drag event transmission.

## Root Cause

The issue stems from multiple potential mutation points in the drag chain:

1. **Reference passing** - passing `stack.cards` directly instead of cloning
2. **Hook recalculation** - `useTempStackDisplay` hook modifying internal state
3. **Fake object creation** - creating a `fakeStack` object for display calculations

## Affected Code Locations

### 1. GameBoard.tsx - Emit Drag Start

```javascript
// BEFORE (problematic - passes reference)
emitDragStackStart(stack.cards, stack.stackId, 'temp_stack', { x: normX, y: normY });

// AFTER (fixed - clones array)
emitDragStackStart([...stack.cards], stack.stackId, 'temp_stack', { x: normX, y: normY });
```

**File:** `components/game/GameBoard.tsx`
**Line:** ~449

### 2. useOpponentDrag.ts - Receive Drag Start

```javascript
// BEFORE (problematic - uses reference)
setOpponentDrag({
  cards: data.cards,
  ...
});

// AFTER (fixed - clones array)
setOpponentDrag({
  cards: data.cards.slice(),
  ...
});
```

**File:** `hooks/multiplayer/useOpponentDrag.ts`
**Line:** ~152

### 3. OpponentGhostStack.tsx - Display Hook

```javascript
// BEFORE (problematic - creates fake stack and uses hook)
const fakeStack = useMemo(() => ({
  stackId: stackId || 'ghost',
  type: stackType,
  owner: 0,
  cards: cards,
  pendingExtension: false,
  pendingCards: [],
}), [stackId, stackType, cards]);

const { displayValue, badgeColor } = useTempStackDisplay(fakeStack, cards, false, 2, false);

// AFTER (simplified - no hook, no calculation)
const badgeLabel = stackType === 'temp_stack' ? 'TEMP' : 'BLD';
const badgeColor = '#2e7d32';
```

**File:** `components/game/OpponentGhostStack.tsx`
**Lines:** ~55-75

## Complete Data Flow

| Step | Location | Action | Guard Applied |
|------|----------|--------|---------------|
| 1 | GameBoard.tsx | emitDragStackStart | `[...stack.cards]` spread |
| 2 | Server | broadcasts to others | N/A |
| 3 | useOpponentDrag.ts | receives and stores | `.slice()` clone |
| 4 | OpponentGhostStack.tsx | renders ghost | No hook, direct render |

## Guard Rails Applied

### Fix 1: Clone Before Emit
```javascript
emitDragStackStart([...stack.cards], stack.stackId, 'temp_stack', { x: normX, y: normY });
```

### Fix 2: Clone On Receive
```javascript
cards: data.cards.slice(),
```

### Fix 3: Simplified Ghost (No Hook)
```javascript
// No useTempStackDisplay
// No fakeStack object
// Just render cards as received
const badgeLabel = stackType === 'temp_stack' ? 'TEMP' : 'BLD';
```

## Debug Logs Added

For troubleshooting, the following logs were added:

| File | Log |
|------|-----|
| GameBoard.tsx | `[GameBoard] emitDragStackStart - cards order:` |
| useOpponentDrag.ts | `[useOpponentDrag] handleDragStackStart - cards:` |
| OpponentGhostStack.tsx | `[OpponentGhostStack] card order:` |
| TempStackView.tsx | `[TempStackView] Hiding original - opponent is dragging:` |
| TempStackItem.tsx | `[TempStackItem] Props check:` |
| TableItemRenderer.tsx | `[TableItemRenderer] TempStackItem props:` |

## Expected Behavior After Fix

1. **Active player** sees their temp stack normally while dragging
2. **Opponent** sees:
   - Original stack hidden (to avoid duplicate)
   - Ghost stack at drag position
   - Cards displayed EXACTLY as sent (no alteration)
   - "TEMP" badge (no calculated value)

## Files Modified

1. `components/game/GameBoard.tsx`
2. `hooks/multiplayer/useOpponentDrag.ts`
3. `components/game/OpponentGhostStack.tsx`
4. `components/table/TableArea.tsx`
5. `components/table/items/TableItemRenderer.tsx`
6. `components/table/items/TempStackItem.tsx`
7. `components/table/TempStackView.tsx`

## Summary

The alteration issue was caused by:
1. Passing array references instead of clones
2. Using display calculation hooks that could modify state
3. Creating fake stack objects for display

The fix ensures:
1. Arrays are cloned at emit and receive points
2. No hooks calculate/alter display values in ghost
3. Cards render exactly as received