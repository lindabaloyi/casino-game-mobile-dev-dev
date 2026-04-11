# GameBoard Drop Handler Refactoring Plan

## Current State Analysis

The `handleDropOnStack` function in `GameBoard.tsx` is a large, generic function that handles three distinct drop scenarios:

1. **Build Stack Drops** (lines ~505-575)
   - Complex logic for steal modal on opponent builds
   - Party mode teammate considerations
   - Ownership validation
   - Routes to `friendBuildDrop` or `opponentBuildDrop`

2. **Temp Stack Drops** (line ~577)
   - Simple routing to `addToTemp`

3. **Loose Card Drops** (line ~580)
   - Routes to `createTemp`

## Problems with Current Implementation

- **Single Responsibility Violation**: One function handles three different drop types with vastly different logic
- **Complex Conditional Logic**: Deep nesting makes the steal modal logic hard to follow
- **Mixed Concerns**: UI modal logic mixed with action routing
- **Hard to Test**: Large function with multiple code paths
- **Hard to Maintain**: Changes to one drop type risk affecting others

## Refactoring Strategy

### Phase 1: Extract Handler Functions

Create three separate handler functions, each responsible for one drop type:

#### 1. `handleBuildStackDrop(card, stackId, stackOwner, source)`

**Responsibilities:**
- Handle steal modal logic for opponent builds
- Check party mode teammate conditions
- Route to appropriate build drop action (`friendBuildDrop`/`opponentBuildDrop`)

**Key Logic to Extract:**
```typescript
// Steal modal conditions
if (source === 'hand' && stackType === 'build_stack' && stackOwner !== playerNumber) {
  // Party mode teammate check
  // Steal vs capture logic
  // Modal opening
}

// Action routing
const isFriendly = stackOwner === playerNumber || (isPartyGame(gameState) && areTeammates(playerNumber, stackOwner));
if (isFriendly) {
  actions.friendBuildDrop(card, stackId, source);
} else {
  actions.opponentBuildDrop(card, stackId, source);
}
```

#### 2. `handleTempStackDrop(card, stackId, source)`

**Responsibilities:**
- Route to `addToTemp` action
- Simple validation (stack exists, etc.)

#### 3. `handleLooseCardDrop(card, source)`

**Responsibilities:**
- Route to `createTemp` action
- Handle target card logic if needed

### Phase 2: Simplify Main Handler

The main `handleDropOnStack` becomes a simple dispatcher:

```typescript
const handleDropOnStack = useCallback((card, stackId, stackOwner, stackType, source) => {
  modals.hideEndTurnButton();

  switch (stackType) {
    case 'build_stack':
      return handleBuildStackDrop(card, stackId, stackOwner, source);
    case 'temp_stack':
      return handleTempStackDrop(card, stackId, source);
    default:
      return handleLooseCardDrop(card, source);
  }
}, [dependencies]);
```

### Phase 3: Extract Shared Logic

#### Steal Modal Logic

Move steal modal logic to a separate function:

```typescript
const shouldShowStealModal = (card, build, source, playerNumber, gameState) => {
  // Return { showModal: boolean, isTeammate: boolean, isSteal: boolean }
}
```

#### Build Ownership Logic

Create a utility function for determining build friendliness:

```typescript
const getBuildOwnership = (stackOwner, playerNumber, gameState) => {
  return {
    isFriendly: stackOwner === playerNumber || (isPartyGame(gameState) && areTeammates(playerNumber, stackOwner)),
    isOpponent: stackOwner !== playerNumber && !(isPartyGame(gameState) && areTeammates(playerNumber, stackOwner)),
    isTeammate: isPartyGame(gameState) && areTeammates(playerNumber, stackOwner)
  };
}
```

## Implementation Steps

### Step 1: Create Utility Functions

1. `shouldShowStealModal(card, build, source, playerNumber, gameState)`
2. `getBuildOwnership(stackOwner, playerNumber, gameState)`
3. `isValidSteal(card, build)` (extract steal logic)

### Step 2: Extract Handler Functions

1. Create `handleBuildStackDrop` with modal logic and action routing
2. Create `handleTempStackDrop` with simple routing
3. Create `handleLooseCardDrop` with createTemp logic

### Step 3: Update Main Handler

Replace the large conditional logic with a clean switch statement.

### Step 4: Update Dependencies

Ensure all useCallback dependencies are correct for the extracted functions.

### Step 5: Testing

- Test each handler function individually
- Test steal modal logic
- Test action routing for all scenarios
- Test party mode vs solo mode

## Benefits of Refactoring

1. **Single Responsibility**: Each function has one clear purpose
2. **Testability**: Smaller functions are easier to unit test
3. **Maintainability**: Changes to one drop type don't affect others
4. **Readability**: Clear separation of concerns
5. **Reusability**: Handler functions can be reused elsewhere if needed

## Migration Strategy

- Keep existing function as fallback during development
- Implement new handlers incrementally
- Update tests to cover new structure
- Remove old code once new implementation is stable

## File Structure

```
components/game/GameBoard.tsx
├── handleDropOnStack (dispatcher)
├── handleBuildStackDrop
├── handleTempStackDrop
├── handleLooseCardDrop
├── shouldShowStealModal (utility)
├── getBuildOwnership (utility)
└── isValidSteal (utility)
```</content>
<parameter name="filePath">handleDropOnStack-refactor-plan.md