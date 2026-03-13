# Subset Sum Algorithm for Diff Build Detection

## Problem Statement

The current `acceptBuildExtension` logic only handles **sum builds** using simple addition. For **diff builds**, we need to detect **contiguous card groups** that equal the target build value.

### Current Limitation

```javascript
const addedPendingValue = pendingCards.reduce((sum, c) => sum + c.value, 0);
```

This only works for sum builds where all cards are combined. It doesn't work for diff builds where only contiguous groups matter.

---

## Proposed Solution: Hybrid Approach

### Strategy 1: Simple Sum (Current - No Change)

For builds where the total value ≤ 10, use the existing simple sum logic:

```javascript
if (totalPendingValue <= 10) {
  // Use existing sum logic
}
```

### Strategy 2: Sliding Window for Diff Builds

For diff builds (target > 10 or explicitly diff type), use the contiguous subset algorithm:

```javascript
function findContiguousSubsets(arr, target) {
  const results = [];
  
  for (let start = 0; start < arr.length; start++) {
    let sum = 0;
    let subset = [];
    
    for (let end = start; end < arr.length; end++) {
      sum += arr[end];
      subset.push(arr[end]);
      
      if (sum === target) {
        results.push([...subset]);
        break; // Stop extending this subset
      }
      
      if (sum > target) {
        break; // No point continuing
      }
    }
  }
  
  return results;
}
```

### Strategy 3: Pre-computed Lookup Tables

Since card values are only 1-10, create optimized handlers for each build value:

| Build Value | Possible Combinations |
|-------------|----------------------|
| 1 | [1] |
| 2 | [2], [1+1] |
| 3 | [3], [2+1], [1+1+1] |
| ... | ... |
| 10 | Many combinations |

This allows O(1) lookup for common cases.

---

## Implementation Plan

### Step 1: Create Helper Function

Create `shared/game/utils/buildDetector.js` with:

1. `findContiguousSubsets(cards, target)` - sliding window algorithm
2. `findValidCaptures(cards, target)` - returns all valid capture groups
3. `isValidBuild(pendingCards, buildValue)` - validates if extension is valid

### Step 2: Modify acceptBuildExtension.js

Update the validation logic to:

1. Detect build type (sum vs diff)
2. Use appropriate validation strategy
3. Return detailed error messages for invalid extensions

### Step 3: Add Client-Side Support

Update UI components to:

1. Show valid capture groups to players
2. Highlight which cards can be captured
3. Display helpful error messages

---

## Algorithm Details

### Sliding Window Complexity

- **Time**: O(n²) worst case, but n ≤ 5 (max cards in a build), so effectively O(1)
- **Space**: O(n) for the results array

### Edge Cases to Handle

1. **Empty pending cards** - should fail validation
2. **Single card equals target** - valid
3. **Multiple valid groups** - allow any valid group
4. **No valid groups** - reject with helpful message
5. **Mixed rank cards** - handle A=1, J/Q/K as 10 or special values

### Special Card Values

| Card | Value |
|------|-------|
| A | 1 |
| 2-10 | face value |
| J | 10 |
| Q | 10 |
| K | 10 |

---

## File Changes Required

1. **New file**: `shared/game/utils/buildDetector.js`
2. **Modified**: `shared/game/actions/acceptBuildExtension.js`
3. **Optional**: Client-side UI updates in `BuildStackView.tsx`

---

## Validation Flow

```
acceptBuildExtension called
    │
    ▼
Get pending cards from extension
    │
    ▼
Determine build type (sum vs diff)
    │
    ├── Sum Build (value ≤ 10)
    │   └── Use simple sum validation
    │
    └── Diff Build (value > 10)
        └── Use contiguous subset algorithm
            │
            ▼
        Find all valid groups
            │
            ├── At least one valid group
            │   └── Allow extension
            │
            └── No valid groups
                └── Reject with error message
```

---

## Example Scenarios

### Example 1: Sum Build (Simple)

- Build value: 7
- Pending cards: [3, 4]
- Total: 3 + 4 = 7 ✅
- Result: Valid

### Example 2: Diff Build (Contiguous)

- Build value: 7
- Pending cards: [6, 1, 5, 2, 7]
- Valid groups: [6,1], [5,2], [7] ✅
- Result: Valid (any group works)

### Example 3: Invalid Extension

- Build value: 7
- Pending cards: [5, 3, 2]
- No contiguous group sums to 7 ❌
- Result: Invalid

---

## Next Steps

1. Create `buildDetector.js` with helper functions
2. Integrate into `acceptBuildExtension.js`
3. Test with various card combinations
4. Add client-side error messages
