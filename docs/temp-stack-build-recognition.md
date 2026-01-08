# Temp Stack Build Recognition System

## Overview

The casino game implements a sophisticated build recognition system that identifies valid build structures within temporary stacks. This system extends beyond simple same-value stacks to recognize complex build combinations where cards can sum to form valid builds.

## Current System: Same-Value Temp Stacks

### Recognition Criteria
- **Stack Size**: 2+ cards
- **Value Constraint**: All cards must have identical values
- **Modal Trigger**: Automatically shows modal with capture/build options

### Examples
```javascript
// Valid same-value stacks
[5♠, 5♥]     // 5+5 build
[9♣, 9♦, 9♥] // 9+9+9 build
[2♠, 2♣]     // 2+2 build
```

### Modal Options
- **Capture**: Take all cards as points
- **Build**: Create build for future captures

## Enhanced System: Complex Build Recognition

### Recognition Criteria
- **Stack Size**: 3+ cards (can be 12+ cards)
- **Build Structure**: Cards must form valid build combinations
- **Multiple Builds**: Single temp stack can contain multiple build possibilities
- **Non-Overlapping**: Build combinations cannot share cards

### Build Validation Rules

#### Single Build Structure
A valid build requires:
1. **Base Card**: One card serves as the build value (≤ 10)
2. **Supporting Cards**: Remaining cards must sum exactly to base value
3. **Card Separation**: Base and supporting cards are distinct

```javascript
// Valid build structures
[10,6,4]     // 10 = 6+4 ✓
[7,4,3]      // 7 = 4+3 ✓
[5,3,2]      // 5 = 3+2 ✓
[10,5,3,2]   // 10 = 5+3+2 ✓
[7,3,2,2]    // 7 = 3+2+2 ✓
```

#### Multiple Build Combinations
Complex temp stacks can contain multiple non-overlapping build structures:

```javascript
// Example: [10,6,4,5,3,2,7,3,3,3,3,1]
// Possible build combinations:
[10,6,4]     // 10 = 6+4
[7,3,3,1]    // 7 = 3+3+1
[5,3,2]      // 5 = 3+2
// Remaining cards: [3,3] (no valid builds)
```

## Build Detection Algorithm

### Phase 1: Card Analysis
1. Sort cards by value (descending)
2. Identify potential base cards (values ≤ 10)
3. Group remaining cards by value for combination checking

### Phase 2: Combination Generation
For each potential base card:
1. Generate all possible subsets of remaining cards
2. Check if subset sums equal base value
3. Validate no card overlap between builds
4. Ensure build value constraints

### Phase 3: Build Extraction
1. Present all valid build options to player
2. Allow selection of which build to create
3. Extract selected cards from temp stack
4. Handle remaining cards appropriately

## Implementation Details

### Core Functions

#### `findBuildCombinations(cards)`
```javascript
function findBuildCombinations(cards) {
  const builds = [];

  // Sort cards descending by value
  const sortedCards = [...cards].sort((a,b) => b.value - a.value);

  for (let i = 0; i < sortedCards.length; i++) {
    const baseCard = sortedCards[i];

    // Skip if base > 10
    if (baseCard.value > 10) continue;

    // Get remaining cards
    const remainingCards = sortedCards.slice(i + 1);

    // Find all combinations that sum to base value
    const combinations = findSumCombinations(remainingCards, baseCard.value);

    combinations.forEach(combo => {
      builds.push({
        baseCard,
        supportingCards: combo,
        buildValue: baseCard.value
      });
    });
  }

  return builds;
}
```

#### `findSumCombinations(cards, targetSum)`
```javascript
function findSumCombinations(cards, targetSum) {
  const combinations = [];

  // Generate all possible subsets
  const allSubsets = generateSubsets(cards);

  allSubsets.forEach(subset => {
    const sum = subset.reduce((sum, card) => sum + card.value, 0);
    if (sum === targetSum) {
      combinations.push(subset);
    }
  });

  return combinations;
}
```

### Modal System Integration

#### Option Generation
```javascript
function generateBuildOptions(tempStack) {
  const buildCombinations = findBuildCombinations(tempStack.cards);
  const options = [];

  buildCombinations.forEach((build, index) => {
    options.push({
      type: 'createBuild',
      label: `Build ${build.buildValue} (${build.supportingCards.map(c => c.value).join('+')})`,
      buildData: build,
      actionType: 'createBuildFromTempStack'
    });
  });

  // Add capture option
  options.push({
    type: 'capture',
    label: `Capture all (${tempStack.cards.length} cards)`,
    actionType: 'captureTempStack'
  });

  return options;
}
```

## Advanced Examples

### Complex Multi-Build Scenarios

#### Example 1: [10,6,4,5,3,2]
**Valid Builds:**
- `Build 10 (6+4)` - uses cards 10,6,4
- `Build 5 (3+2)` - uses cards 5,3,2
- Remaining: none

#### Example 2: [7,4,3,2,1,1]
**Valid Builds:**
- `Build 7 (4+3)` - uses 7,4,3
- `Build 2 (1+1)` - uses 2,1,1
- Remaining: none

#### Example 3: [10,5,3,2,1,1,1]
**Valid Builds:**
- `Build 10 (5+3+2)` - uses 10,5,3,2
- `Build 2 (1+1)` - uses 1,1 (one 1 remains)
- Remaining: [1]

### Edge Cases

#### Overlapping Combinations
```javascript
// Cards: [8,4,4,2,2]
// Possible builds:
// Build 8 (4+4) - uses 8,4,4
// Build 4 (2+2) - uses 2,2
// Cannot use Build 8 (4+2+2) due to card overlap
```

#### Build Value Limits
```javascript
// Cards: [12,6,4,2]
// Invalid: 12 > 10, no valid builds possible
// Cards: [10,6,4] - valid build
```

#### Minimum Build Size
```javascript
// Cards: [5,3,2] - valid (3 cards total)
// Cards: [5,3] - invalid (only 2 cards)
// Cards: [5,2,2,1] - valid (4 cards total)
```

## Game Flow Integration

### Player Interaction Sequence

1. **Stack Creation**: Player creates temp stack with 3+ cards
2. **Build Detection**: System scans for valid build combinations
3. **Modal Display**: Shows all possible build/capture options
4. **Player Choice**: Selects desired action
5. **Build Creation**: Extract build cards, create table build
6. **Remaining Cards**: Handle leftover cards in temp stack

### State Management

#### Before Build Creation
```
Table: [loose cards...]
Temp Stack: [10,6,4,5,3,2] (owned by player)
```

#### After Creating Build 10 (6+4)
```
Table: [loose cards..., Build[10] with cards [10,6,4]]
Temp Stack: [5,3,2] (if valid) or removed (if empty)
```

## Testing Scenarios

### Unit Test Cases

#### Valid Build Recognition
```javascript
// Test case 1
const stack = [10,6,4];
const builds = findBuildCombinations(stack);
// Expected: [{baseCard: 10, supportingCards: [6,4], buildValue: 10}]

// Test case 2
const stack = [7,4,3,2,1];
const builds = findBuildCombinations(stack);
// Expected: [{baseCard: 7, supportingCards: [4,3], buildValue: 7}]
```

#### Invalid Build Cases
```javascript
// No valid combinations
const stack = [10,7,3]; // 7+3=10, but 10≠7 and 10≠3
const builds = findBuildCombinations(stack);
// Expected: []

// Build value too high
const stack = [12,6,4,2];
const builds = findBuildCombinations(stack);
// Expected: []
```

## Performance Considerations

### Optimization Strategies

1. **Early Termination**: Skip base cards > 10
2. **Subset Limiting**: Restrict subset sizes for large stacks
3. **Memoization**: Cache combination results
4. **Card Sorting**: Process higher-value cards first

### Complexity Analysis
- **Time Complexity**: O(2^n) for subset generation (n = cards in stack)
- **Space Complexity**: O(2^n) for storing combinations
- **Practical Limit**: Max 12-15 cards per temp stack for performance

## Future Enhancements

### Potential Additions
1. **Build Chaining**: Allow builds to extend other builds
2. **Multi-Base Builds**: Support builds with multiple base cards
3. **Strategic Hints**: AI suggestions for optimal build combinations
4. **Build Undo**: Allow players to revert build decisions

### Balance Considerations
1. **Build Limits**: Prevent overly complex build trees
2. **Point Scaling**: Adjust scoring for complex builds
3. **Time Limits**: Add pressure for build decisions

## Conclusion

The temp stack build recognition system transforms simple card collections into strategic build opportunities. By identifying valid build structures within temp stacks, players can create complex build combinations that enhance gameplay depth while maintaining casino game rules and balance.