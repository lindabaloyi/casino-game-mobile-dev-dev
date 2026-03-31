# Plan: Implement Refined Capture Validation for Temp Stacks

## Objective
Update `captureTemp.js` to implement the refined capture validation from `.clinerules`:
- Check each constituent build within a partition
- For sum builds (total ≤10): all cards must be loose
- For difference builds: no restriction

## Current Implementation
The current `validateOpponentCaptureCards()` in `captureTemp.js` handles:
- Simple single builds (sum vs difference)
- Multi-build detection (but doesn't check each sub-build)

## Implementation Steps

### Step 1: Add getValidPartition helper function
Create a function that returns the card indices for each partition (sub-build):
```javascript
function getValidPartition(values) {
  // Use calculateMultiBuildValue to get the partition
  const result = calculateMultiBuildValue(values);
  if (result === null) return null; // Not a valid multi-build
  
  // For single build, return whole array
  if (result.buildType === 'sum' || result.buildType === 'diff') {
    return [values.map((_, i) => i)];
  }
  
  // For multi-build, need to find the actual partition
  // Use bit mask iteration similar to calculateMultiBuildValue
  // Return array of index arrays, each representing a sub-build
}
```

### Step 2: Update validateOpponentCaptureCards function
Rewrite the validation to:
1. Try to get valid partition
2. For each sub-build in partition:
   - Calculate total value
   - If total ≤10 (sum build): check all cards are loose
   - If total >10 (difference build): no restriction
3. If any sum build has capture card → reject

### Step 3: Update card source checking
- "Opponent capture card" = source starts with 'captured_' AND is not the current player's captures
- Need playerIndex to determine opponent vs own capture

## Files to Modify
- `shared/game/actions/captureTemp.js`

## Testing Scenarios
1. [ ] Sum build [5,3,opponentCapture] → should fail
2. [ ] Difference build [8,opponentCapture,3] → should pass
3. [ ] Multi-build [4,4,4,4] all loose → should pass
4. [ ] Multi-build [4,opponentCapture,4,4] where partition is [4,4]+[4,4] → should fail (sum sub-builds)
5. [ ] Multi-build [8,2,6,4] all any source → should pass (difference sub-builds)

## Implementation Details

### Card Source Types
- `'hand'` - card from player's hand (loose)
- `'table'` - card from table (loose)
- `'captured'` - player's own captures (loose for themselves)
- `'captured_0'`, `'captured_1'`, etc. - other player's captures

### Key Logic
```javascript
function hasCaptureCardSource(card) {
  const source = card.source;
  if (!source) return false;
  return source.startsWith('captured');
}

// For determining if it's opponent's capture:
// - 'captured' = own capture (not opponent)
// - 'captured_X' where X !== playerIndex = opponent's capture

function isOpponentCaptureCard(card, playerIndex) {
  const source = card.source;
  if (!source) return false;
  if (source === 'captured') return false; // Own capture
  if (source.startsWith('captured_')) {
    const ownerIdx = parseInt(source.split('_')[1], 10);
    return ownerIdx !== playerIndex;
  }
  return false;
}
```
