# BuildStackView Badge Fix Plan

## Problem

The badge calculation in `BuildStackView.tsx` currently uses simple subtraction:
- `remainingNeed = stack.value - totalPendingValue`
- This doesn't reset after exact matches

**Example of broken behavior (build = 8):**
- Drop 6 → shows `-2` ✅
- Drop 2 → sum = 8, should reset and show `8`, but shows `-6` ❌

## Solution: Running Need Algorithm

Replace the simple subtraction with an algorithm that maintains a running sum that resets whenever it equals the build value.

### Algorithm

1. Start with `need = -buildValue`
2. Iterate through pending cards **in order they were added**
3. For each card:
   - If `need === 0` (just completed), start fresh: `need = -buildValue`
   - Add card value to need: `need = need + cardValue`
   - If `need === 0` after adding → reset to `-buildValue`
4. Display:
   - `need === 0` → show `buildValue` (completed)
   - `need < 0` → show `${need}` (still need cards)
   - `need > 0` → show `+${need}` (excess)

### Example Walkthrough (build = 8)

| Cards Added | Running Need | Display |
|-------------|--------------|---------|
| Start | -8 | 8 |
| +6 | -8 + 6 = -2 | -2 |
| +2 | -2 + 2 = 0 → reset → -8 | 8 |
| +5 | -8 + 5 = -3 | -3 |
| +3 | -3 + 3 = 0 → reset → -8 | 8 |
| +4 | -8 + 4 = -4 | -4 |
| +4 | -4 + 4 = 0 → reset → -8 | 8 |
| +1 | -8 + 1 = -7 | -7 |
| +7 | -7 + 7 = 0 → reset → -8 | 8 |
| +8 | exact match → show 8 | 8 |
| +9 | -8 + 9 = 1 | +1 |

## Implementation

### Location
`components/table/BuildStackView.tsx`, lines 214-248

### Replace this code (lines 214-248):

```typescript
// CURRENT CODE - BROKEN
// Calculate total pending value (sum of all pending cards for multi-card extensions)
let totalPendingValue = 0;
if (pendingExtension?.cards) {
  totalPendingValue = pendingExtension.cards.reduce((sum, p) => sum + p.card.value, 0);
} else if (pendingExtension?.looseCard) {
  totalPendingValue = pendingExtension.looseCard.value;
}

// Calculate remaining need
const remainingNeed = stack.value - totalPendingValue;

// Build value badge color - use team colors throughout
const getBadgeColor = (): string => {
  if (isExtending) {
    if (remainingNeed > 0) {
      // Incomplete extension - use accent color for warning
      return colors.accent;
    } else {
      // Complete - use gold for P1, purple for P2 (2-player) or team colors (party)
      return isPartyMode 
        ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
        : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
    }
  } else {
    // Completed build - use gold for P1, purple for P2 (2-player) or team colors (party)
    return isPartyMode 
      ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
      : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
  }
};

const displayValue = isExtending && remainingNeed > 0 
  ? `-${remainingNeed}` 
  : (stack.value?.toString() ?? '-');
const badgeColor = getBadgeColor();
```

### With this code:

```typescript
// NEW CODE - FIXED
// Get pending cards in order they were added
const pendingCards = pendingExtension?.cards?.map(p => p.card) ?? 
                    (pendingExtension?.looseCard ? [pendingExtension.looseCard] : []);

// Compute effective sum with reset on exact matches
let effectiveSum = 0;
for (const card of pendingCards) {
  effectiveSum += card.value;
  if (effectiveSum === stack.value) {
    effectiveSum = 0; // reset after exact match
  }
}

let displayValue: string;
if (effectiveSum === 0) {
  // Currently at a completed state (or no pending cards)
  displayValue = stack.value?.toString() ?? '-';
} else if (effectiveSum < stack.value) {
  // Need more cards
  displayValue = `-${stack.value - effectiveSum}`;
} else {
  // Excess
  displayValue = `+${effectiveSum - stack.value}`;
}

// Badge color: accent while incomplete (effectiveSum !== 0), team color when complete
const getBadgeColor = (): string => {
  if (isExtending) {
    if (effectiveSum !== 0) {
      return colors.accent; // incomplete
    } else {
      // complete – use team color
      return isPartyMode 
        ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
        : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
    }
  } else {
    // Not extending – normal team color
    return isPartyMode 
      ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
      : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
  }
};

const badgeColor = getBadgeColor();
```

## Why This Works

1. **O(n) complexity** - Iterates through pending cards once
2. **Matches server logic** - The server validates extensions using contiguous subset detection; this UI calculation mirrors that behavior
3. **Resets on exact match** - After sum equals build value, the counter resets, allowing the next card to start fresh
4. **Handles excess** - Shows `+N` when sum exceeds build value

## Testing Scenarios

1. Single card equals build → shows build value
2. Two cards sum to build → shows build value after second card
3. Cards sum exceeds build → shows `+N`
4. Multiple completions in sequence → each completion resets the counter
5. No pending cards → shows build value (completed state)
