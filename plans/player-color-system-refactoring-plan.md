# Player Color System Refactoring Plan

## Problem Summary

The player color system has multiple sources of truth, causing inconsistent colors across the game:

- **PRD Colors**: Sky Blue (#0284c7), Amber (#c2410c), Lime Green (#15803d), Fuchsia (#a21caf)
- **Old Colors still in use**: Orange/Gold (#FF9800), Purple (#9C27B0), Blue (#2196F3), Burgundy (#800020)

## Current State

### Canonical Source (SHOULD be single source)
- `constants/teamColors.ts` - Contains all PRD colors and `getPlayerColors()` function

### Files with Issues

| File | Issue | Priority |
|------|-------|----------|
| `components/ui/TurnIndicator.tsx` | Has duplicate `getFreeForAllColors()` with OLD colors | 🔴 HIGH |
| `components/game/GameOpponentsMenu.tsx` | Hardcoded color array not using teamColors | 🔴 HIGH |
| `components/ui/PlayerIcon.tsx` | Uses `getTeamColors()` instead of `getPlayerColors()` | 🟡 MEDIUM |
| Various UI files | Hardcoded `#FF9800` for UI states (timers, ready indicators) | 🟢 LOW |

## Proposed Architecture

### Single Source of Truth

```
constants/teamColors.ts
├── TEAM_A_COLORS (Sky Blue)
├── TEAM_B_COLORS (Amber) 
├── PLAYER_1_COLORS (Sky Blue)
├── PLAYER_2_COLORS (Amber)
├── PLAYER_3_COLORS (Lime Green)
├── PLAYER_4_COLORS (Fuchsia)
├── getPlayerColors(playerIndex, playerCount)  <- PRIMARY FUNCTION
├── getTeamColors(teamId)
└── Convenience exports: PLAYER_1_PRIMARY, PLAYER_2_PRIMARY, etc.
```

### Files to Update

#### Phase 1: Critical (Fix Inconsistencies)

1. **TurnIndicator.tsx**
   - REMOVE: `getFreeForAllColors()` function (lines 44-125)
   - REPLACE: with `getPlayerColors(playerIndex, playerCount)`
   - UPDATE: Comment at lines 10-17 with new color names

2. **GameOpponentsMenu.tsx**
   - REMOVE: Hardcoded array at line 115
   - ADD: Import `getPlayerColors` from teamColors
   - REPLACE: `getPlayerColor()` function to use imported function

#### Phase 2: Medium Priority (Align Functions)

3. **PlayerIcon.tsx**
   - UPDATE: Use `getPlayerColors()` for player-specific colors
   - KEEP: Use `getTeamColors()` for team-based display
   - UPDATE: Comments at lines 5-6, 41-42

4. **useTempStackDisplay.ts**
   - Check imports and ensure consistency

#### Phase 3: Low Priority (UI Colors - Optional)

5. Timer warnings, ready indicators can keep `#FF9800` (these are UI affordances, not player identification)

## Implementation Steps

### Step 1: Add convenience exports to teamColors.ts

```typescript
// Add after existing exports:
export const PLAYER_PRIMARY_COLORS = [
  PLAYER_1_COLORS.primary,  // #0284c7
  PLAYER_2_COLORS.primary,  // #c2410c
  PLAYER_3_COLORS.primary,  // #15803d
  PLAYER_4_COLORS.primary,  // #a21caf
];

// Helper to get just the primary color
export function getPlayerPrimaryColor(playerIndex: number, playerCount: number = 2): string {
  return PLAYER_PRIMARY_COLORS[playerIndex % 4];
}
```

### Step 2: Fix TurnIndicator.tsx

```typescript
// REMOVE: getFreeForAllColors() function entirely
// UPDATE: Use getPlayerColors directly

// In the component:
teamColors = isPartyMode 
  ? (currentTeam === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS)
  : getPlayerColors(currentPlayerIndex, playerCount);
```

### Step 3: Fix GameOpponentsMenu.tsx

```typescript
// ADD import:
import { getPlayerColors } from '../../constants/teamColors';

// REPLACE getPlayerColor function:
const getPlayerColor = (index: number) => {
  return getPlayerColors(index, 4).primary;
};
```

## Verification

After refactoring, verify:

1. All players in 4-player FFA see: Sky Blue → Amber → Lime Green → Fuchsia
2. All players in 3-player mode see: Sky Blue → Amber → Fuchsia
3. All players in 2-player mode see: Sky Blue → Amber
4. Party mode uses team colors consistently

## Files to Test

- [x] TurnIndicator.tsx - REFACTORED: Removed getFreeForAllColors, using getPlayerColors()
- [x] GameOpponentsMenu.tsx - REFACTORED: Removed hardcoded colors, using getPlayerColors()
- [x] useTempStackDisplay.ts - REFACTORED: Removed switch statements, using getPlayerColors()
- [x] PlayerIcon.tsx - UPDATED: Comments to reflect new PRD colors
- [x] useBuildTeamInfo - Already using teamColors correctly

## Changes Made

### TurnIndicator.tsx
- Removed duplicate `getFreeForAllColors()` function (lines 44-125)
- Now uses `getPlayerColors(currentPlayerIndex, playerCount)` for FFA modes
- Updated comments to reflect new PRD colors
- Cleaned up unused imports (areTeammates, PLAYER_1_GOLD, etc.)

### GameOpponentsMenu.tsx  
- Removed hardcoded color array `['#FF9800', '#9C27B0', '#2196F3', '#800020']`
- Now imports and uses `getPlayerColors(index, 4).primary`

### useTempStackDisplay.ts
- Replaced switch statement (lines 63-84) with `getPlayerColors(stack.owner, playerCount).primary`
- Removed individual color constants (PLAYER_1_GOLD, etc.) from imports
- Updated COLORS export to use getPlayerColors internally
