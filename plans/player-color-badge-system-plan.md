# Player Color & Badge System Implementation Plan

## Overview
Refactor player color system to use mode-aware color tokens with fixed hex values, replacing current ad-hoc color assignments.

## Existing Architecture
- ✅ [`constants/teamColors.ts`](constants/teamColors.ts:1) already exists with player/team color system
- ✅ [`getPlayerColors(playerIndex, playerCount)`](constants/teamColors.ts:122) handles color selection by player count
- ✅ Party mode uses Team A (Orange) and Team B (Purple)

## Required Changes (Update Existing System)

### Step 1: Update Color Values in teamColors.ts

**Current values vs PRD requirements:**

| Player | Current | PRD Required | Action |
|--------|---------|--------------|--------|
| P1 | #FF9800 (Orange) | #0284c7 (Sky Blue) | UPDATE |
| P2 | #9C27B0 (Purple) | #c2410c (Amber) | UPDATE |
| P3 (4p FFA) | #2196F3 (Blue) | #15803d (Lime Green) | UPDATE |
| P4 | #800020 (Burgundy) | #a21caf (Fuchsia) | UPDATE |
| P3 (3-hand) | #2196F3 (Blue) | #a21caf (Fuchsia) | SPECIAL CASE |

**Update to constants/teamColors.ts:**

```typescript
// Player 1 colors - Sky Blue (#0284c7)
export const PLAYER_1_COLORS: TeamColors = {
  primary: '#0284c7',
  secondary: '#E0F2FE',
  accent: '#0369A1',
  background: '#E0F2FE',
  text: '#0369A1',
  border: '#38BDF8',
};

// Player 2 colors - Amber (#c2410c)
export const PLAYER_2_COLORS: TeamColors = {
  primary: '#c2410c',
  secondary: '#FFF7ED',
  accent: '#9A3412',
  background: '#FFF7ED',
  text: '#9A3412',
  border: '#FB923C',
};

// Player 3 colors - Lime Green for 4-player FFA (#15803d)
export const PLAYER_3_COLORS: TeamColors = {
  primary: '#15803d',
  secondary: '#DCFCE7',
  accent: '#166534',
  background: '#DCFCE7',
  text: '#166534',
  border: '#4ADE80',
};

// Player 4 colors - Fuchsia (#a21caf)
export const PLAYER_4_COLORS: TeamColors = {
  primary: '#a21caf',
  secondary: '#FCE7F3',
  accent: '#BE185D',
  background: '#FCE7F3',
  text: '#BE185D',
  border: '#F472B6',
};
```

### Step 2: Handle 3-Hand Special Case

Update `getPlayerColors` function (line ~122-144):

```typescript
if (playerCount === 3) {
  switch (playerIndex) {
    case 0: return PLAYER_1_COLORS;   // Sky Blue
    case 1: return PLAYER_2_COLORS;   // Amber
    case 2: return PLAYER_4_COLORS;   // Fuchsia (NOT PLAYER_3_COLORS!)
    default: return NEUTRAL_COLORS;
  }
}
```

### Step 3: Update Components

**BuildValueBadge.tsx** - Already uses `getPlayerColors(playerIndex, playerCount)`
- Verify it passes playerCount correctly

**PlayerTag** - Check existing implementation, update to use same helper

**ModalDesignSystem getTeamButtonStyle** - Already handles party vs non-party
- For party mode: P1/P3 → Team A (Sky Blue), P2/P4 → Team B (Amber)

### Step 4: Add PLAYER_COLORS Export (Optional)

Add convenience map to teamColors.ts if needed by other components:

```typescript
export const PLAYER_COLORS_MAP: Record<number, string> = {
  0: PLAYER_1_COLORS.primary,
  1: PLAYER_2_COLORS.primary,
  2: PLAYER_3_COLORS.primary,
  3: PLAYER_4_COLORS.primary,
};
```

---

## Implementation Order

1. Update `constants/teamColors.ts` color values
2. Fix 3-hand P3 special case (use Fuchsia not Lime)
3. Verify BuildValueBadge uses getPlayerColors correctly
4. Verify PlayerTag uses getPlayerColors
5. Test all game modes

---

## Edge Cases

| Scenario | Expected | Handling |
|----------|----------|----------|
| 3-hand P3 | Fuchsia (#a21caf) | Updated in getPlayerColors |
| Party mode P1+P3 | Same color (Team A) | Already works via getTeamColors |
| Invalid playerCount | Fallback to 2-player | Default in getPlayerColors |