# Drop System Analysis: Client-Server Flow & stackId Investigation

## Executive Summary

The casino game's drop system has a fundamental architectural issue where `stackId` is being used as both source and destination identifier, causing temp stack drops to fail. The investigation reveals that the client constructs target stack IDs correctly, but the server-side logic doesn't properly handle empty-space drops.

## Architecture Overview

### Client-Server Data Flow

```
Client Drag → Drop Zone Hit → TableCards.tsx → TableInteractionManager.tsx → handleDropOnCard → Server
```

### Key Components

1. **DraggableCard.tsx** - Handles touch events and drop zone detection
2. **CardStack.tsx** - Registers drop zones with `stackId`
3. **TableCards.tsx** - Calls `handleDropOnStack` with constructed `stackId`
4. **TableInteractionManager.tsx** - Routes drops to server via `handleDropOnCard`
5. **GameCoordinatorService.js** - Server-side drop coordination
6. **actionDetermination.js** - Server-side action validation

## The stackId Parameter Investigation

### Where stackId Originates

**File:** `TableCards.tsx` (lines 222, 234, 244)

```typescript
// 1. Loose cards: stackId = "loose-${originalPosition}"
return handleDropOnStack(draggedItem, `loose-${originalPosition}`);

// 2. Build cards: stackId = "build-${originalPosition}"
onDropStack={(draggedItem) => handleDropOnStack(draggedItem, `build-${originalPosition}`)}

// 3. Temp stacks: stackId = tableItem.stackId || "temp-${originalPosition}"
onDropStack={(draggedItem) => handleDropOnStack(draggedItem, (tableItem as any).stackId || `temp-${originalPosition}`)}
```

**Conclusion:** `stackId` correctly represents the **target destination**, not the dragged card's source.

### Server-Side Drop Handling

**File:** `GameCoordinatorService.js` - `handleCardDrop` method

**Key Logic:**
```javascript
// 1. Receive client payload
const data = {
  draggedItem: { card, source, player },
  targetInfo: { type, card, index, draggedSource }
};

// 2. Call determineActions (no stackId involved)
const result = this.gameManager.determineActions(gameId, data.draggedItem, data.targetInfo);

// 3. Route to appropriate action handler
const newGameState = this.actionRouter.executeAction(gameId, playerIndex, action);
```

**Finding:** The server-side logic works correctly with `draggedItem` and `targetInfo`, but the client-side `TableInteractionManager.tsx` is trying to parse `stackId` as a target identifier.

## Root Cause Analysis

### The Architectural Problem

The system has **two competing drop handling mechanisms**:

1. **CardStack.tsx → TableCards.tsx → TableInteractionManager.tsx** (uses `stackId`)
2. **useDragHandlers.ts → handleDropOnCard** (uses `targetInfo`)

When a drop occurs:
- `CardStack.tsx` detects the drop and calls `onDropStack` with `stackId`
- `TableCards.tsx` calls `handleDropOnStack(stackId)`
- `TableInteractionManager.tsx` tries to parse `stackId` to find target
- But `handleDropOnCard` also gets called with proper `targetInfo`

### The "loose-0" Debug Log Explained

```
[DEBUG] Processing drop with stackId: loose-0
[ERROR] No target found for stackId: loose-0
```

**Correct Interpretation:**
- `stackId: "loose-0"` = Target is loose card at position 0
- This is the **destination**, not the source
- The error occurs because the parsing logic doesn't handle "loose-" prefix

### Why Temp Stack Drops Fail

1. **Temp stacks work:** `stackId = "temp-123456789"` → parsing finds temp stack correctly
2. **Loose cards fail:** `stackId = "loose-0"` → parsing doesn't handle "loose-" prefix
3. **Build cards fail:** `stackId = "build-1"` → parsing doesn't handle "build-" prefix

## Current Implementation Issues

### TableInteractionManager.tsx Problems

```typescript
// Current broken logic
const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
  // Only handles temp stacks and card- prefixes
  if (stackId.startsWith('temp-') || stackId.startsWith('staging-')) {
    // Find temp stack by stackId
  }
  if (!targetItem && stackId.startsWith('card-')) {
    // Only handles "card-" prefix, not "loose-" or "build-"
    const targetIndex = parseInt(parts[1]);
    targetItem = tableCards[targetIndex];
  }
});
```

### Missing Prefixes

The current code only handles:
- ✅ `"temp-123456789"` (temp stacks)
- ❌ `"loose-0"` (loose cards)
- ❌ `"build-1"` (build cards)

## Recommended Solution

### Option 1: Fix Prefix Parsing (Minimal)

Add support for all prefixes in `TableInteractionManager.tsx`:

```typescript
const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
  let targetItem;
  let isTempStack = false;

  // Strategy 1: Temp stacks by stackId
  if (stackId.startsWith('temp-') || stackId.startsWith('staging-')) {
    targetItem = tableCards.find(item => item?.stackId === stackId);
    isTempStack = !!targetItem;
  }

  // Strategy 2: Loose/Build cards by index
  if (!targetItem && (stackId.startsWith('loose-') || stackId.startsWith('build-') || stackId.startsWith('card-'))) {
    const parts = stackId.split('-');
    const targetIndex = parseInt(parts[1]);
    targetItem = tableCards[targetIndex];
    isTempStack = false;
  }

  // Continue with existing logic...
});
```

### Option 2: Architectural Cleanup (Recommended)

Remove the `handleDropOnStack` parsing entirely and rely on the existing `handleDropOnCard` system that already works with proper `targetInfo`.

## Testing Scenarios

### Current Behavior (Broken)
- ✅ Temp stack → Temp stack (works)
- ❌ Loose card → Temp stack (fails - "loose-0" not parsed)
- ❌ Build card → Temp stack (fails - "build-1" not parsed)

### After Fix
- ✅ Temp stack → Temp stack
- ✅ Loose card → Temp stack
- ✅ Build card → Temp stack
- ✅ Any card → Empty space (create new temp stack)

## Implementation Priority

1. **High:** Fix prefix parsing to handle "loose-" and "build-" prefixes
2. **Medium:** Add comprehensive debug logging
3. **Low:** Consider architectural cleanup to remove duplicate drop systems

## Files Modified

- `TableInteractionManager.tsx` - Fix prefix parsing logic
- Add debug logging to trace `stackId` flow
- Test all drop scenarios

## Conclusion

The issue is not fundamental architecture confusion, but incomplete prefix handling in the parsing logic. The `stackId` correctly represents target destinations, but the parser doesn't handle all target types. A simple fix to support "loose-" and "build-" prefixes will resolve the temp stack drop failures.
