# Same-Value Card Detection & Strategic Options

## Overview

The same-value card detection system provides strategic depth when players drag cards of identical rank (same value) onto each other. Instead of auto-capturing, the system creates a temporary stack and presents players with meaningful choices between immediate capturte and future build opportunities.

## Core Algorithm

### 1. Detection Logic

```javascript
const detectSameValueStack = (stack) => {
  if (!stack.cards || stack.cards.length < 2) return false;
  const cards = stack.cards;
  const firstValue = cards[0]?.value;
  return cards.every(card => card.value === firstValue);
};
```

**Detection Criteria:**
- Temp stack must contain 2+ cards
- All cards must have identical `value` property
- Returns `true` for same-value stacks (e.g., [5♠, 5♥, 5♦])

### 2. Strategic Options Calculation

```javascript
const calculateStrategicOptions = (stack, hand) => {
  const options = [];
  const cards = stack.cards || [];
  const stackValue = cards[0]?.value; // All cards have same value
  const stackSum = cards.reduce((sum, card) => sum + card.value, 0);

  // Player has already played their card by creating this temp stack
  // Modal only decides: capture the temp stack OR build with temp stack value

  // 1. ALWAYS: Capture the temp stack as-is
  options.push({
    type: 'capture',
    label: `Capture ${stackSum}`, // Capture the total value of the temp stack
    card: null, // No additional card needed
    value: stackSum
  });

  // 2. BUILD OPTION: Create build with temp stack value (if valid)
  // Only allow if the build value would be valid (≤ 10)
  if (stackSum <= 10) {
    options.push({
      type: 'build',
      label: `Build ${stackSum}`, // Build using the temp stack sum
      card: null, // No additional card needed - using temp stack as-is
      value: stackSum
    });
  }

  return options;
};
```

## Game Flow

### Player Action Sequence

1. **Drag Phase**: Player drags card A onto card B
   ```javascript
   // Example: 5♠ (hand) + 5♥ (table) = temp stack [5♠, 5♥]
   ```

2. **Detection Phase**: System identifies same-value interaction
   ```javascript
   // System detects: both cards have value=5
   // Creates temp stack with isSameValueStack=true flag
   ```

3. **Modal Phase**: Player chooses strategic option
   ```javascript
   // Options presented:
   // - "Capture 10" (immediate points)
   // - "Build 10" (future capturing opportunity)
   ```

4. **Execution Phase**: Selected action executes
   ```javascript
   // Capture: Cards move to player captures, points awarded
   // Build: Temp stack converts to build on table
   ```

## Strategic Decision Matrix

### Example Scenarios

#### Scenario 1: [5♠, 5♥] Temp Stack (Sum = 10)

**Options Available:**
- ✅ **"Capture 10"** - Immediate 10 points
- ✅ **"Build 10"** - Create build for future capture

**Strategic Considerations:**
- **Capture**: Guaranteed points now, but opponent might capture your build later
- **Build**: Risk-reward - could capture more later, but opponent might steal it

#### Scenario 2: [5♠, 5♥, 5♦] Temp Stack (Sum = 15)

**Options Available:**
- ✅ **"Capture 15"** - Immediate 15 points
- ❌ **"Build 15"** - Invalid (exceeds max build value of 10)

**Strategic Considerations:**
- Only capture option available due to build size limit
- High immediate value reward for complete set

#### Scenario 3: [5♠, 5♥] with Player Hand [5♣, 10♠]

**Options Available:**
- ✅ **"Capture 10"** - Capture existing temp stack
- ✅ **"Build 10"** - Build with existing temp stack

**Important Note:**
- System does NOT add 5♣ from hand to increase build size
- Player already played their card (5♠) to create the temp stack
- Modal only decides fate of existing temp stack cards

## Implementation Details

### Client-Side Logic (AcceptValidationModal.tsx)

```javascript
// Detect same-value temp stacks
const detectSameValueStack = (stack) => {
  if (!stack.cards || stack.cards.length < 2) return false;
  const cards = stack.cards;
  const firstValue = cards[0]?.value;
  return cards.every(card => card.value === firstValue);
};

// Calculate strategic options using only temp stack cards
const calculateStrategicOptions = (stack, hand) => {
  // Uses temp stack sum for capture/build values
  // No additional cards from hand are considered
  // Player turn already consumed by drag action
};
```

### Server-Side Logic (tempRules.js)

```javascript
// Same-value temp stack actions rule (priority 95)
{
  id: 'same-value-temp-stack-actions',
  priority: 95,
  exclusive: false,
  requiresModal: true,
  condition: (context) => {
    const targetInfo = context.targetInfo;
    const isTempStack = targetInfo?.type === 'temporary_stack';
    const isSameValueStack = targetInfo.isSameValueStack === true;
    return isTempStack && isSameValueStack;
  },
  action: (context) => {
    // Generate capture and build options using temp stack only
    // No additional hand card analysis for same-value stacks
  }
}
```

## Key Design Principles

### 1. One Card Per Turn
- Drag action consumes player's turn
- Modal only decides play style (capture vs build)
- No additional cards played during modal interaction

### 2. Strategic Depth
- **Immediate Gratification**: Capture for guaranteed points
- **Long-term Strategy**: Build for potential larger captures
- **Risk Assessment**: Consider opponent moves and board state

### 3. Game Balance
- Build size limits maintained (≤ 10)
- Point scoring integrated with capture system
- No exploitation through multi-card plays

### 4. User Experience
- Clear modal options with descriptive labels
- Visual feedback for valid/invalid choices
- Seamless integration with existing game flow

## Testing Examples

### Test Case 1: Basic Same-Value Detection
```javascript
// Input: Temp stack [5♠, 5♥]
const result = detectSameValueStack(stack);
// Expected: true

const options = calculateStrategicOptions(stack, hand);
// Expected: [{type: 'capture', label: 'Capture 10'}, {type: 'build', label: 'Build 10'}]
```

### Test Case 2: Oversized Build Prevention
```javascript
// Input: Temp stack [7♠, 7♥, 7♦] (sum = 21)
const options = calculateStrategicOptions(stack, hand);
// Expected: [{type: 'capture', label: 'Capture 21'}] // Build option excluded
```

### Test Case 3: Hand Cards Ignored
```javascript
// Input: Temp stack [5♠, 5♥], Hand [5♣, 10♠]
const options = calculateStrategicOptions(stack, hand);
// Expected: No options using 5♣ or 10♠
// Only temp stack cards considered for calculations
```

## Integration Points

### With Contact Detection System
- `cardHandler.ts` creates temp stacks with `isSameValueStack` flag
- Contact system routes same-value interactions to modal instead of auto-capture

### With Action System
- Modal selections trigger `captureTempStack` or `createBuildFromTempStack` actions
- Server validates actions and updates game state accordingly

### With UI System
- Temp stack overlay shows "Accept" button for same-value stacks
- Modal presents clean strategic choices without technical complexity

## Future Enhancements

### Potential Additions:
1. **Build Size Warnings**: Visual indicators for oversized builds
2. **Opponent Analysis**: AI hints about opponent capture risks
3. **Build Value Calculator**: Show potential future capture values
4. **Undo Functionality**: Allow players to change their mind before execution

### Balance Considerations:
1. **Build Limit Adjustments**: Could be made configurable
2. **Point Multipliers**: Special scoring for complete sets
3. **Time Limits**: Add pressure for quick strategic decisions

## Conclusion

The same-value card detection system transforms simple card matches into meaningful strategic decisions. By presenting players with clear capture vs. build choices, the game adds depth while maintaining intuitive gameplay. The modal-based approach ensures players understand their options without overwhelming complexity, creating engaging decision points throughout each round.
