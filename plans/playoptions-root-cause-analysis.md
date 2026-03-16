# PlayOptionsModal - ROOT CAUSE ANALYSIS

## The Issue

**Accept temp is bypassing the modal - players are NOT being prompted to choose build values.**

---

## Root Cause: Auto-Capture Feature

The issue is in [`hooks/game/useActionHandlers.ts`](hooks/game/useActionHandlers.ts), lines 62-85:

```typescript
const handleAcceptClick = useCallback((stackId: string) => {
  const stack = table.find((tc: any) => tc.stackId === stackId);
  if (stack) {
    // Check for auto-capture eligibility
    const autoCapture = checkAutoCaptureEligibility(...);
    
    if (autoCapture.shouldAutoCapture && autoCapture.captureValue) {
      // ⚠️ Auto-capture WITHOUT showing modal!
      actions.acceptTemp(stackId, autoCapture.captureValue);
      return;
    }
    
    // Show modal as normal
    modals.openPlayModal(stack);
  }
}, [...]);
```

---

## How Auto-Capture Works

From [`hooks/game/useAutoCaptureDetection.ts`](hooks/game/useAutoCaptureDetection.ts):

**Conditions for auto-capture (bypassing modal):**
1. Player has exactly ONE temp stack on table
2. Temp stack is complete (no pending card)
3. Player has exactly ONE card in hand that can capture
4. No alternative plays exist

**When auto-capture triggers:**
```typescript
// If exactly one matching card in hand → auto-capture
if (matchingCards.length === 1 && !hasAlternatives) {
  return { shouldAutoCapture: true, captureValue: matchingCards[0].value };
}
```

---

## Why This Is PROBLEMATIC

**Example:** Player has temp stack 4+4 (can build 8 or 4)

| Scenario | Player Hand | Possible Values | Result |
|----------|-------------|-----------------|--------|
| Player has 8 | [8] | [4, 8] | Modal ❌ (2 options) |
| Player has 4 | [4] | [4, 8] | Auto-capture ⚠️ (1 option) |
| Player has 4 and 8 | [4, 8] | [4, 8] | Modal ❌ (2 options) |

**The bug:** When player has ONE card that matches ANY possible value (like 4), it auto-captures - even though there are MULTIPLE valid build interpretations (like 4+4 could be build 4 OR build 8).

---

## The Fix

The auto-capture logic should NOT auto-capture when there are **multiple valid build interpretations**, even if player only has ONE card in hand.

**Change in `useAutoCaptureDetection.ts`:**

```typescript
// BEFORE (line 202):
if (matchingCards.length > 1) {
  return { shouldAutoCapture: false, reason: 'Multiple capture options' };
}

// AFTER: Also check if there are multiple possible VALUES
const uniqueCaptureValues = new Set(matchingCards.map(c => c.value));
if (matchingCards.length > 1 || uniqueCaptureValues.size > 1) {
  return { shouldAutoCapture: false, reason: 'Multiple capture values' };
}
```

Or simply: **Disable auto-capture entirely** for temp stack acceptance (build value selection), since the whole point is to let users choose between different build interpretations.

---

## Summary

| Component | Status |
|-----------|--------|
| PlayOptionsModal logic | ✅ Works correctly |
| getBuildHint utility | ✅ Exists and calculates correctly |
| Modal prop passing | ✅ Being passed correctly |
| Auto-capture feature | ❌ **BUG: Bypassing modal incorrectly** |

**The auto-capture feature is too aggressive** - it auto-captures when player has ANY single matching card, without considering that there may be MULTIPLE valid build values (like 4+4 could be build 4 OR build 8).

---

## Files to Fix

| File | Line(s) | Change |
|------|---------|--------|
| `hooks/game/useAutoCaptureDetection.ts` | 202-207 | Disable auto-capture OR fix value counting logic |
