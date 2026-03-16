# Plan: Shiya Recall - Full Capture Snapshot

## Problem

Currently, when an opponent captures a build with Shiya active:
1. Only the **build cards** are tracked in `shiyaRecalls`
2. The **capture cards** (cards opponent used to capture the build) are NOT stored
3. During recall, only build cards are removed from capturer's pile - capture cards remain

This creates an inconsistent state where the capture pile has extra cards.

## Solution

Store a complete snapshot at capture time and restore everything during recall.

---

## Implementation Plan

### Step 1: Update Shiya Action to Store Capture Cards

**File:** `shared/game/actions/shiya.js`

When a player activates Shiya on a teammate's build, no changes needed here - the flag is set on the build.

### Step 2: Update Capture Action to Store Full Record

**Files to check:**
- `shared/game/actions/captureOwn.js` - When capturing own build
- `shared/game/actions/captureOpponent.js` - When capturing opponent's build  
- `shared/game/actions/dropToCapture.js` - When dropping temp stack to capture
- Or wherever capture logic handles builds with `shiShiyaActive`

**Changes:**
When capturing a build with `shiyaActive: true`, store:
```javascript
shiyaRecalls[recallFor] = {
  stackId: build.stackId,
  buildCards: build.cards,        // Cards in the build
  captureCards: captureCards,      // Cards used to capture (array)
  value: build.value,
  originalOwner: build.owner,
  capturedBy: playerIndex,         // Who captured it
  capturedAt: Date.now()
};
```

### Step 3: Update Recall Action to Restore Full State

**File:** `shared/game/actions/recallBuild.js`

**Changes:**
1. Remove build cards from capturer's captures
2. Remove capture cards from capturer's captures
3. Return capture cards to capturer's hand
4. Recreate build on table under recalling player

### Step 4: Update Frontend Types

**File:** `types/game.types.ts`

Update ShiyaRecall interface:
```typescript
export interface ShiyaRecall {
  stackId: string;
  buildCards: Card[];      // Cards that were in the build
  captureCards: Card[];    // Cards used to capture (NEW)
  value: number;
  capturedBy: number;
  originalOwner: number;
  expiresAt: number;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `types/game.types.ts` | Add captureCards to ShiyaRecall |
| `shared/game/actions/shiya.js` | (No changes needed) |
| `shared/game/actions/capture*.js` | Store captureCards when capturing Shiya build |
| `shared/game/actions/recallBuild.js` | Remove both build+capture cards, return capture cards to hand |

---

## Key Logic

### Capture Time (when opponent captures Shiya build)
```javascript
if (build.shiyaActive) {
  const captureCards = [/* cards player used from hand to capture */];
  newState.shiyaRecalls[shiShiyaPlayer] = {
    buildCards: build.cards,
    captureCards: captureCards,
    value: build.value,
    originalOwner: build.owner,
    capturedBy: playerIndex
  };
}
```

### Recall Time
```javascript
// Remove build cards
capturingCaptures = removeCards(capturingCaptures, recall.buildCards);

// Remove capture cards  
capturingCaptures = removeCards(capturingCaptures, recall.captureCards);

// Return capture cards to hand
capturingPlayer.hand.push(...recall.captureCards);

// Recreate build
newBuild = {
  owner: playerIndex,  // recalling player
  cards: recall.buildCards,
  value: recall.value,
  shiyaActive: false
};
```

---

## Edge Cases

1. **Multiple capture cards**: Store as array, remove all during recall
2. **Multiple pending recalls**: Change structure from single object to map by stackId
3. **Capture cards already used**: Shouldn't happen if recall happens immediately

---

## Acceptance Criteria

1. ✅ Capture stores both buildCards and captureCards
2. ✅ Recall removes both sets from capturer's captures
3. ✅ Capture cards return to capturer's hand
4. ✅ Build recreated under recalling player
5. ✅ State is consistent after recall
