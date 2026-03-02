# One Build Per Player - Implementation Plan

## Requirement
Prevent a player from building if they already own an active build. Each player should only be allowed to have one build at a time.

Example: If Player 1 already owns build number 8, they should not be able to convert their temporary stack to create another build numbered 9.

## Current Game State Structure
- `tableCards[]` - Array of all cards/stacks on table
- Each stack has:
  - `type`: `'temp_stack' | 'build_stack' | undefined` (undefined = loose card)
  - `owner`: player index (0 or 1)

## Build Creation Flow
1. **createTemp** - Creates a temporary stack (temp_stack) from hand + table cards
2. **acceptTemp** - Converts temp_stack to build_stack (ownership set here)
3. **stealBuild** - Steals opponent's build and changes ownership to thief

## Implementation Strategy

### Where to Add Validation: SmartRouter
The validation should be added in SmartRouter because:
- It's the central place for game rule routing
- It already handles validation for steals
- It receives all actions before they're executed

### Actions to Validate
1. **`createTemp`** - **ALLOWED** - Player can create temp stacks even with active builds
   - Temp stacks are not yet builds, so the check happens on Accept

2. **`acceptTemp`** - Check if player already owns a `build_stack`
   - If yes → reject with error (can't convert temp to build if you already have one)
   - If no → allow

3. **`stealBuild`** - Should be ALLOWED
   - Player is taking ownership of an existing build (not creating new)
   - After steal, they own that build and can't create another

### Implementation Steps

#### Step 1: Add Helper Method to SmartRouter
```javascript
/**
 * Check if player already has an active build
 * @param {object} state - Game state
 * @param {number} playerIndex - Player to check
 * @returns {boolean} True if player owns any build_stack
 */
playerHasActiveBuild(state, playerIndex) {
  return state.tableCards.some(
    tc => tc.type === 'build_stack' && tc.owner === playerIndex
  );
}
```

#### Step 2: Add routeCreateTemp Method
```javascript
/**
 * Route createTemp action
 * - Validate player doesn't already have an active build
 */
routeCreateTemp(payload, state, playerIndex) {
  // Check if player already has an active build
  if (this.playerHasActiveBuild(state, playerIndex)) {
    throw new Error('You already have an active build. Complete or capture it before creating a new one.');
  }
  
  // Allow createTemp
  return { type: 'createTemp', payload };
}
```

#### Step 3: Update route() Method
```javascript
route(actionType, payload, state, playerIndex) {
  switch (actionType) {
    case 'capture':
      return this.routeCapture(payload, state, playerIndex);
    case 'extendBuild':
      return this.routeExtendBuild(payload, state);
    case 'createTemp':  // NEW
      return this.routeCreateTemp(payload, state, playerIndex);
    default:
      return { type: actionType, payload };
  }
}
```

#### Step 4: Update ActionRouter
Ensure ActionRouter passes `createTemp` through SmartRouter for validation (it already does this via the smartRouter.route() call).

## Error Messages
- **createTemp when build exists**: "You already have an active build. Complete or capture it before creating a new one."

## Testing Scenarios
1. Player with no builds → createTemp → Success
2. Player with existing build → createTemp → Error
3. Player with existing build → stealBuild → Success (takes ownership)
4. Player who just stole → createTemp → Error (now has build)
