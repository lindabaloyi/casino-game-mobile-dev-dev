# Plan: Add Capture Validation to captureTemp.js

## Objective
Add validation to `captureTemp.js` to enforce the rules from `.clinerules`:
- **Sum builds (total ≤10)**: No opponent capture cards allowed
- **Difference builds (total >10)**: Opponent capture cards allowed  
- **Multi-builds**: Opponent capture cards allowed

## Implementation Steps

### Step 1: Add build calculator import
Add import for `buildCalculator` from `../buildCalculator` at the top of `captureTemp.js`.

### Step 2: Create validation function
Add `validateOpponentCaptureCards(cards)` function that:
1. Gets card values and calculates total
2. Checks if any cards have `source` starting with `captured_` (opponent's capture pile)
3. If no opponent capture cards → passes validation
4. If opponent capture cards present:
   - Try multi-build validation first (calculateMultiBuildValue)
   - Then try difference build (total >10, target = max value)
   - If neither → reject for sum build

### Step 3: Add validation call
In `captureTemp()`, after finding the stack but before capturing, call validation on:
- `stack.cards` (existing temp stack cards)
- Plus the dropped card being used to capture

### Step 4: Handle error
If validation fails, throw error with clear message explaining why.

## Code Structure

```javascript
// After imports
const buildCalculator = require('../buildCalculator');

function validateOpponentCaptureCards(cards, captureCard) {
  // Combine all cards for validation
  const allCards = [...cards, { ...captureCard, source: 'hand' }];
  const values = allCards.map(c => c.value);
  // ... validation logic per .clinerules rules
}
```

## Testing Scenarios
- [ ] Sum build with opponent card → should fail
- [ ] Sum build with only hand/table cards → should pass  
- [ ] Difference build with opponent card → should pass
- [ ] Multi-build with opponent card → should pass

## Files Modified
- `shared/game/actions/captureTemp.js`