# PlayOptionsModal Debugging - Investigation Findings

## Executive Summary

**Issue:** When a player creates a temp stack, clicking "Accept" should show the PlayOptionsModal with all possible build options (e.g., for 4+4: "Build 8 (sum)" and "Build 4 (base)"). This is not working in the current version.

---

## Investigation Summary

### Files Investigated

| File | Purpose |
|------|---------|
| `shared/game/actions/acceptTemp.js` | Backend action - accepts temp stack with chosen build value |
| `shared/game/actions/createTemp.js` | Backend action - creates temp stack from cards |
| `components/modals/PlayOptionsModal.tsx` | Frontend modal - shows build options to user |
| `components/game/GameModals.tsx` | Orchestrates all modals including PlayOptionsModal |
| `hooks/game/useModalManager.ts` | Manages modal open/close state |
| `hooks/game/useActionHandlers.ts` | Handles Accept button click → opens modal |
| `types/game.types.ts` | Type definitions for TempStack |

---

## Current Data Flow

```
1. Player creates temp stack (drag hand card to table card)
   → createTemp action runs on server
   → Temp stack created with: cards[], value, base, need, buildType

2. Player clicks "Accept" button on temp stack
   → TempStackOverlay or StackActionStrip calls onAccept(stackId)
   → useActionHandlers.handleAcceptClick(stackId) is called
   → modals.openPlayModal(stack) is called
   → PlayOptionsModal shows

3. Player selects build option
   → onConfirm(buildValue) is called
   → acceptTemp action runs on server with stackId and buildValue
   → Temp stack converted to build stack
```

---

## Root Cause Analysis

### PRIMARY ISSUE: Build Option Logic is Too Simple

The current `PlayOptionsModal.tsx` (lines 34-62) uses a **simplified algorithm** that doesn't detect all possible build values:

```typescript
// Current logic (lines 35-51)
const totalSum = cards.reduce((sum, c) => sum + c.value, 0);

let buildValue, buildType;
if (totalSum <= 10) {
  // SUM BUILD
  buildValue = totalSum;
  buildType = 'sum';
} else {
  // DIFF BUILD - just uses base value
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  buildValue = base;
  buildType = 'diff';
}
```

**Problems with this approach:**

1. **Same-rank builds not handled:** For 4+4, the logic only shows base 4, not sum 8
2. **Incomplete builds ignored:** The `need` field from temp stack is not used
3. **No `getBuildHint` function:** Earlier version had intelligent build calculation (doesn't exist now)

### SECONDARY ISSUE: Modal Never Shows Multiple Options

Looking at lines 103-128 of PlayOptionsModal:

```typescript
{hasTotalMatch && (
  <TouchableOpacity onPress={() => onConfirm(totalSum)}>
    <Text>Build {totalSum} (sum)</Text>
  </TouchableOpacity>
)}

{hasDiffMatch && (
  <TouchableOpacity onPress={() => onConfirm(buildValue)}>
    <Text>Build {buildValue} (base)</Text>
  </TouchableOpacity>
)}
```

**Problem:** Each option only shows if `hasXMatch` is true (player has matching card in hand). But for same-rank builds like 4+4:
- `totalSum = 8`, `buildValue = 4`
- If player has 8 in hand → shows "Build 8 (sum)"  
- If player has 4 in hand → shows "Build 4 (base)"
- **Neither shows BOTH options!**

---

## What SHOULD Happen

For a temp stack with cards [4♠, 4♥] (value 4+4):

| Build Value | Condition | Current Behavior | Expected Behavior |
|-------------|-----------|------------------|-------------------|
| 8 (sum) | totalSum <= 10 | Shows IF player has 8 | Should show |
| 4 (base) | Always | Shows IF player has 4 | Should show |
| 4 (single) | Same rank | **Never shows** | Should show |

The modal should show **ALL valid build values** regardless of whether player has matching cards in hand (for standard builds), OR at least show both sum and base options when both are valid.

---

## Missing Components

### 1. `getBuildHint` Utility Function

The earlier version referenced `getBuildHint` from `utils/buildCalculator`. This function:
- Calculates all possible build values from cards
- Handles sum, diff, and same-rank builds
- Returns { value, need, isComplete }

**Current Status:** Does NOT exist in codebase.

### 2. Team Build Support (Party Mode)

Earlier version had `teamCapturedBuilds` prop to allow rebuilding teammate's captured builds.

**Current Status:** This prop was REMOVED from current PlayOptionsModal.

---

## Evidence from Code

### acceptTemp.js (Backend) - Lines 33-47

```javascript
const finalValue = buildValue || stack.value;

// VALIDATION: Check if opponent already has a build with the same value
const opponentIndex = playerIndex === 0 ? 1 : 0;
const opponentBuilds = newState.tableCards.filter(
  tc => tc.type === 'build_stack' && tc.owner === opponentIndex
);

const opponentHasSameValue = opponentBuilds.some(build => build.value === finalValue);

if (opponentHasSameValue) {
  throw new Error(`acceptTemp: Cannot accept build with value ${finalValue} - opponent already has a build with this value`);
}
```

This validates that the build value from frontend is accepted by server.

### createTemp.js (Backend) - Lines 94-124

```javascript
const [bottom, top] = firstCard.value >= tableCard.value
  ? [{ ...firstCard, source: firstSource }, { ...tableCard, source: 'table' }]
  : [{ ...tableCard, source: 'table' }, { ...firstCard, source: firstSource }];

const cards = [bottom, top];
const totalSum = cards.reduce((sum, c) => sum + c.value, 0);

// Calculates buildType: 'sum' or 'diff'
let base, need, buildType;
if (totalSum <= 10) {
  base = totalSum;
  need = 0;
  buildType = 'sum';
} else {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  base = sorted[0].value;
  need = base - sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
  buildType = 'diff';
}
```

This correctly calculates and stores `base`, `need`, and `buildType` on the temp stack.

---

## Summary of Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Build option logic too simple - doesn't detect same-rank builds | HIGH | Needs fix |
| 2 | `getBuildHint` utility doesn't exist | HIGH | Needs implementation |
| 3 | Modal only shows options player has cards for | MEDIUM | May be intentional but limits flexibility |
| 4 | `teamCapturedBuilds` prop removed | MEDIUM | Feature regression |

---

## Recommended Fixes

1. **Add `getBuildHint` utility function** - Create intelligent build value calculator
2. **Update PlayOptionsModal** - Use getBuildHint to show all valid build options
3. **Show both sum AND base options** - When both are valid, show both (not just one)
4. **Restore teamCapturedBuilds support** - For party mode cooperative rebuilds

---

## Questions for Clarification

1. **Should the modal show options even if player doesn't have matching card?** 
   - Current: Only shows if player has the card
   - Question: Should show all valid builds regardless of hand?

2. **Is teamCapturedBuilds (party mode) still needed?**
   - Earlier version had it, current version removed it
   - Need to confirm if this feature should be restored

3. **Are there other build scenarios not covered?**
   - e.g., 3+3+3 (could be 3, 6, or 9)
   - Need to verify all edge cases
