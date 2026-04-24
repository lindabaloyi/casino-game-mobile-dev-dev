# Ghost Card Logic - Unification Findings

## Date: 2026-04-22
## Branch: feat-multiplayer-add-stack

---

## Summary

Unified the ghost card overlay logic for all drag sources (hand, table, captured, temp_stack, build_stack) by copying working patterns from main branch and adding fade-out animation support for stack drops.

---

## Current vs Main Branch Comparison

| Aspect | Main Branch | Current Branch |
|--------|-----------|--------------|
| **Components** | 2 separate (GhostCard, GhostStack) | 1 unified (GhostOverlay) |
| **Stack handling** | Dedicated component | Mixed with cards |
| **Fade out on drop** | Yes (via position lookup) | **Was missing** |

---

## Issues Found & Fixed

### Issue 1: Ghost Vanished Immediately on Stack Drop
**Before:** `handleDragStackEnd` immediately cleared state → ghost disappeared instantly
**After:** State preserved with `isDragging: false`, targetId set → fade-out animation plays → auto-clear after 500ms

### Issue 2: OpponentGhostOverlay Missing Fade-Out Trigger
**Before:** Only checked `targetId` with `positionRegistry`
**After:** Added check for `!isDragging && targetId` to trigger fade-out animation

---

## Changes Made

### 1. `hooks/multiplayer/useOpponentDrag.ts`
```typescript
// handleDragStackEnd - Keep state for fade-out animation
if (data.outcome === 'success' && data.targetId) {
  setOpponentDrag(prev => prev ? {
    ...prev,
    isDragging: false,
    targetType: data.targetType,
    targetId: data.targetId,
  } : null);
  
  // Auto-clear after animation completes (~400ms spring + 300ms fade)
  setTimeout(() => setOpponentDrag(null), 500);
} else {
  setOpponentDrag(null);
}
```

### 2. `components/game/OpponentGhostOverlay.tsx`
```typescript
// Added fade-out trigger
if (!opponentDrag.isDragging && opponentDrag.targetId) {
  shouldFadeOut = true;
} else if (opponentDrag.targetId && positionRegistry) {
  // existing position lookup logic
}
```

### 3. Deleted (replaced by unified overlay)
- `components/game/OpponentGhostCard.tsx` (deleted)
- `components/game/OpponentGhostStack.tsx` (deleted)
- `components/table/utils/cardVisibility.ts` (deleted)

### 4. Centralized Hook
- `hooks/game/useGhostVisibility.ts` (new) - handles all 5 sources

---

## Files Modified

| File | Change |
|------|--------|
| `hooks/multiplayer/useOpponentDrag.ts` | Added fade-out delay on stack drop |
| `components/game/OpponentGhostOverlay.tsx` | Added fade-out trigger |
| `hooks/game/useGhostVisibility.ts` | New centralized visibility hook |
| `components/table/TempStackView.tsx` | Uses useGhostVisibility hook |
| `components/table/BuildStackView.tsx` | Uses useGhostVisibility hook |
| `components/table/TableArea.tsx` | Uses useGhostVisibility hook |
| `components/table/DraggableOpponentCard.tsx` | Uses useGhostVisibility hook |
| `components/game/PlayerHandArea.tsx` | Uses useGhostVisibility hook |

---

## Flow: Stack Drag with Fade-Out

```
1. Player drags temp/build stack
   ↓
2. emitDragStackStart → Server broadcasts 'opponent-drag-stack-start'
   ↓
3. GhostOverlay shows top card, follows drag position
   ↓
4. TempStackView/BuildStackView hides via isTempStackHidden/isBuildStackHidden
   ↓
5. Player drops stack
   ↓
6. emitDragStackEnd → Server broadcasts 'opponent-drag-stack-end'
   ↓
7. handleDragStackEnd:
   - Sets isDragging: false, targetId: <dropped_on>
   - 500ms setTimeout to auto-clear
   ↓
8. GhostOverlay detects !isDragging && targetId
   - Snaps to target position
   - Fades out opacity (withTiming 300ms)
   ↓
9. auto-clear removes ghost
```

---

## Sources Supported (via useGhostVisibility)

| Source | Hook Function |
|--------|------------|
| `hand` | `isHandCardHidden(cardId)` |
| `table` | `isTableCardHidden(cardId)` |
| `captured` | `isCapturedCardHidden(cardId)` |
| `temp_stack` | `isTempStackHidden(stackId)` |
| `build_stack` | `isBuildStackHidden(stackId)` |

---

## Notes

- Cards are cloned via `.slice()` before storing to prevent mutation issues
- Animation duration: ~500ms total (400ms spring + 300ms fade overlap)
- Position registries: `cards`, `tempStacks`, `buildStacks`, `capturePiles`
- All draggable components now use centralized `useGhostVisibility` hook