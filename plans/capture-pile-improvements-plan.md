# CapturePile Improvements Plan

## Overview
Improve the capture pile registration system and optimize the OpponentGhostCard component for better performance.

## Current Issues Identified

### 1. CapturePile.tsx - Incorrect unregister
- Line 101: `unregisterCapturePile()` is called without passing `playerIndex`
- The `useDrag` hook's `unregisterCapturePile` expects an optional playerIndex parameter

### 2. OpponentGhostCard.tsx - Performance issues
- Line 57: `initialAbsPos` is computed on every render without memoization
- Lines 122-142: `withSpring` config objects are created inline on every render
- Line 101: `parseInt(targetId, 10)` is called on every render
- Line 145: Large useEffect dependency array may cause unnecessary re-runs

## Implementation Plan

### Phase 1: Fix CapturePile unregisterCapturePile
- Modify `CapturePile.tsx` line 101 to pass `playerIndex` to `unregisterCapturePile()`

### Phase 2: Optimize OpponentGhostCard
1. Add `useMemo` for `initialAbsPos` calculation
2. Extract `withSpring` config objects as constants outside the component
3. Memoize the parsed `playerIndex` from `targetId`
4. Review and optimize useEffect dependencies

## Files to Modify

1. `components/table/CapturePile.tsx`
2. `components/game/OpponentGhostCard.tsx`

## Testing
- Verify capture piles are registered correctly
- Verify ghost card animates smoothly
- Check for any re-render issues
