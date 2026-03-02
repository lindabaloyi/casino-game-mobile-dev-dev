# Extend Build Action - Implementation Plan (Simplified)

## Overview

The Extend Build feature allows a player to extend their own active build by adding:
1. A loose card from the table (or opponent's captured card)
2. A hand card

**Flow (mirrors temp creation):**
1. Player drags loose card to their own build → `startBuildExtension` locks it
2. Player adds hand card, clicks Accept → `acceptBuildExtension` validates & completes
3. Or clicks Cancel → `declineBuildExtension` releases loose card

---

## Server Actions

### 1. `startBuildExtension`
- **Payload:** `{ buildId: string, looseCard: Card }`
- **Logic:**
  - Validates player owns the build
  - Validates loose card exists on table
  - Creates temporary extension state
  - Does NOT advance turn
- **Returns:** New game state with extension pending

### 2. `acceptBuildExtension`
- **Payload:** `{ buildId: string, handCard: Card }`
- **Logic:**
  - Validates player owns the build
  - Validates hand card is in player's hand
  - Validates: (build value + loose card value + hand card value) creates valid sum/diff
  - If valid: Add both cards to build, end turn
  - If invalid: Throw error
- **Returns:** New game state (turn advances)

### 3. `declineBuildExtension`
- **Payload:** `{ buildId: string }`
- **Logic:**
  - Returns loose card back to table
  - Clears extension state
  - Does NOT advance turn
- **Returns:** New game state

---

## Data Structure

### BuildStack (extended)
```javascript
{
  type: 'build_stack',
  stackId: 'build_123',
  cards: [{rank: '9', suit: '♠', value: 9}],
  owner: 0,
  value: 9,
  hasBase: true,
  // Extension state
  pendingExtension: {
    looseCard: {rank: '5', suit: '♦', value: 5},  // Locked from table
  }
}
```

---

## Validation Logic

The `acceptBuildExtension` validates:

1. **Ownership:** Player must own the build
2. **Build validity:** New cards create valid sum/diff:
   - Sum ≤ 10: All cards sum together
   - Sum > 10: Largest card is base, others sum to it (or create diff)

Example: Build 9 + loose 5 + hand 4 = 18
- Sorted: [9, 5, 4] → base=9, need=0 (9=9+0) ✓ Valid → turn advances

Example: Build 9 + loose 5 + hand 3 = 17
- Sorted: [9, 5, 3] → base=9, need=1 (9≠9+1) ✗ Invalid → error thrown

---

## Implementation Order

### Step 1: Server Actions
- [ ] Register actions in `index.js`
- [ ] Create `startBuildExtension.js`
- [ ] Create `acceptBuildExtension.js`
- [ ] Create `declineBuildExtension.js`

### Step 2: Client Hooks
- [ ] Update `useGameActions.ts` with new action callbacks

### Step 3: UI Components
- [ ] Update `useModalManager.ts` for extension modal
- [ ] Create `ExtendBuildModal.tsx` (or reuse existing modal)
- [ ] Update `GameBoard.tsx` handle drag to own build
- [ ] Update `TableArea.tsx` with extension callbacks

### Step 4: Integration
- [ ] Wire up all callbacks
- [ ] Test the flow

---

## Key Points

- **Only owner can extend** their own build (opponents cannot extend)
- **Loose cards from table** or **opponent's captured cards** can be used
- **Hand card required** to complete extension
- **Turn advances** only on successful accept
- **Error handling** returns cards to original positions
