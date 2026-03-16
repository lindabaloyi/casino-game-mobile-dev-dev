# Plan: Double-Click Confirmation for Temp Build Base Value

## Problem Statement

Currently, tapping a temp stack immediately calls `setTempBuildValue` with the base value. This single-click behavior:
1. Happens prematurely before player is ready
2. Can cause race conditions where stale actions are sent after turn changes
3. Doesn't give players explicit control over when their temp build base value is activated

## Solution

Implement a two-step confirmation process:
1. Detect double-clicks instead of single clicks
2. Show a confirmation modal displaying the proposed base value
3. Only dispatch `setTempBuildValue` when user confirms

## Implementation Steps

### Step 1: Create ConfirmTempBuildModal Component

**File:** `components/modals/ConfirmTempBuildModal.tsx`

A simple confirmation modal showing:
- Stack ID and current value
- Confirm button to set the base value
- Cancel button to abort

**Style:** Match existing casino-themed modals (green background, orange accents)

### Step 2: Add Modal State to useModalManager

**File:** `hooks/game/useModalManager.ts`

Add state for the new modal:
```typescript
// Confirm Temp Build Value Modal
showConfirmTempBuild: boolean;
confirmTempBuildStack: TempStack | null;

openConfirmTempBuildModal: (stack: TempStack) => void;
closeConfirmTempBuildModal: () => void;
```

### Step 3: Update GameModals to Include New Modal

**File:** `components/game/GameModals.tsx`

Add props and render the new `ConfirmTempBuildModal`:
```typescript
// New props
showConfirmTempBuild: boolean;
confirmTempBuildStack: TempStack | null;
onConfirmTempBuild: (value: number) => void;
onCancelConfirmTempBuild: () => void;
```

### Step 4: Update TempStackView for Double-Click Detection

**File:** `components/table/TempStackView.tsx`

Modify the tap handler to detect double-clicks:
- Use a timer-based approach: first tap starts a timer, second tap within threshold cancels timer and triggers action
- Double-click threshold: 300ms (standard for mobile)

Or use React Native's built-in `onDoublePress` if available.

### Step 5: Update GameBoard handleBuildTap

**File:** `components/game/GameBoard.tsx`

Modify `handleBuildTap` callback:
1. Show the confirmation modal instead of directly calling `setTempBuildValue`
2. Pass the selected stack info to the modal

**Change from:**
```typescript
const handleBuildTap = useCallback((stack: any) => {
  if (stack.type === 'temp_stack') {
    console.log('[GameBoard] Temp stack tapped, setting base value:', stack.value);
    actions.setTempBuildValue(stack.stackId, stack.value);
    return;
  }
  // ...
}, [gameState, playerNumber, actions]);
```

**Change to:**
```typescript
const handleBuildTap = useCallback((stack: any) => {
  if (stack.type === 'temp_stack') {
    console.log('[GameBoard] Temp stack tapped, showing confirm modal');
    modals.openConfirmTempBuildModal(stack);
    return;
  }
  // ...
}, [gameState, playerNumber, modals, actions]);
```

### Step 6: Wire Up Confirm Handler in GameBoard

**File:** `components/game/GameBoard.tsx`

Pass the confirm handler to GameModals:
```typescript
<GameModals
  // ... existing props
  showConfirmTempBuild={modals.showConfirmTempBuild}
  confirmTempBuildStack={modals.confirmTempBuildStack}
  onConfirmTempBuild={(value) => {
    if (modals.confirmTempBuildStack) {
      actions.setTempBuildValue(modals.confirmTempBuildStack.stackId, value);
      modals.closeConfirmTempBuildModal();
    }
  }}
  onCancelConfirmTempBuild={modals.closeConfirmTempBuildModal}
/>
```

## Files to Modify

| File | Changes |
|------|---------|
| `components/modals/ConfirmTempBuildModal.tsx` | NEW - Create confirmation modal |
| `hooks/game/useModalManager.ts` | Add modal state and handlers |
| `components/game/GameModals.tsx` | Add new modal rendering |
| `components/table/TempStackView.tsx` | Change to double-click detection |
| `components/game/GameBoard.tsx` | Update handleBuildTap, wire up modal |

## UI Mockup

```
┌─────────────────────────────────────────┐
│      Set Temp Build Base Value           │
│                                          │
│   Stack: tempStack_0                     │
│   Proposed Base Value: 8                 │
│                                          │
│   Cards in stack: [5♠] [3♥]             │
│                                          │
│   ┌───────────────────────────────┐     │
│   │         Confirm               │     │
│   └───────────────────────────────┘     │
│                                          │
│   ┌───────────────────────────────┐     │
│   │         Cancel                │     │
│   └───────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## Double-Click Implementation Details

### Option A: Timer-based Approach (Recommended)
```typescript
const lastTapRef = useRef<number>(0);
const DOUBLE_CLICK_THRESHOLD = 300; // ms

const handleTap = () => {
  const now = Date.now();
  const timeSinceLastTap = now - lastTapRef.current;
  
  if (timeSinceLastTap < DOUBLE_CLICK_THRESHOLD) {
    // Double click detected - show modal
    onDoubleClick?.();
    lastTapRef.current = 0;
  } else {
    // First tap - set timer
    lastTapRef.current = now;
    // Optionally show a hint or do nothing on single click
  }
};
```

### Option B: Native Double Press (Gesture Handler)
React Native Gesture Handler has `onDoublePress` callback on TapGesture:
```typescript
const tapGesture = Gesture.Tap()
  .onDoublePress(() => {
    // Show confirmation modal
  });
```

## Acceptance Criteria

1. ✅ Single tapping a temp stack does NOT immediately set base value
2. ✅ Double-tapping a temp stack shows confirmation modal
3. ✅ Modal displays stack ID and proposed base value
4. ✅ Confirm button dispatches `setTempBuildValue` action
5. ✅ Cancel button closes modal without dispatching action
6. ✅ Double-click threshold is appropriate for game interactions (~300ms)
7. ✅ No race condition errors occur after capturing temp stacks

## Testing Scenarios

1. Single tap on temp stack → Modal should NOT appear
2. Double tap on temp stack → Modal should appear with correct value
3. Click Confirm → Action sent to server
4. Click Cancel → Modal closes, no action sent
5. Tap elsewhere while modal is open → Modal should close (optional)

## Notes

- The double-click threshold of 300ms is standard for mobile games
- This change prevents accidental base value changes and gives players explicit control
- Also fixes the race condition where stale `setTempBuildValue` actions were sent after turn changes (since the action now requires user confirmation)
