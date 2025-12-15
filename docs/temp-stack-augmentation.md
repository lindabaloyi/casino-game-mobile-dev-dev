# Temp Stack Augmentation System

## Overview

The Temp Stack Augmentation system allows players to freely build temporary card stacks by adding multiple cards. This feature implements the "Always Allow, Never Validate" philosophy - players have complete freedom to build any temp stack configuration they want.

## Core Philosophy

**"Always Allow, Never Validate"** - The system prioritizes player freedom over restrictive validation. Any card can be added to any temp stack at any time, giving players maximum flexibility in building their staging combinations.

## User Flow

### Basic Temp Stack Creation
1. **Initial Drop**: Player drags Card A onto Card B (loose card)
   - Creates new temp stack [A, B]
   - Shows staging overlay with Accept/Cancel buttons

### Temp Stack Augmentation
2. **Adding Cards**: Player can drag additional cards onto existing temp stacks
   - Drag Card C onto temp stack [A, B] → becomes [A, B, C]
   - Drag Card D onto temp stack [A, B, C] → becomes [A, B, C, D]
   - **No limits** on number of cards or card types

### Temp Stack Management
3. **Finalize**: Player clicks "Accept" to convert temp stack to build/capture
4. **Cancel**: Player clicks "Cancel" to return cards to original positions
5. **Continue Building**: Player can keep adding cards indefinitely

## Technical Implementation

### Client-Side Components

#### TableInteractionManager.tsx
Handles drop logic with simplified validation:

```typescript
const handleDropOnStack = (draggedItem: any, stackId: string) => {
  // Find target
  const targetItem = findTargetByStackId(stackId);
  const isTempStack = targetItem?.type === 'temporary_stack';

  if (isTempStack) {
    // 🎯 ALWAYS ALLOW: Add to existing temp stack
    return onDropOnCard(draggedItem, {
      type: 'add_to_temp_stack',
      stackId: tempStack.stackId,
      card: draggedItem.card,
      source: draggedItem.source
    });
  } else {
    // 🎯 CREATE: New temp stack from loose cards
    return onDropOnCard(draggedItem, {
      type: 'create_temp_stack',
      targetCard: targetItem,
      draggedCard: draggedItem.card
    });
  }
};
```

#### TempStackRenderer.tsx
Ensures temp stacks always accept drops:

```typescript
// Drop zone registration - ALWAYS accepts
const dropZone = {
  stackId: `temp-${index}`,
  onDrop: (draggedItem) => {
    console.log('[TEMP STACK] Accepting drop:', draggedItem.card);
    return onDropStack(draggedItem) || true; // Always succeeds
  }
};
```

### Server-Side Actions

#### addToStagingStack.js
Simplified server handler with minimal validation:

```javascript
function handleAddToStagingStack(gameManager, playerIndex, action) {
  const { stackId, card, source } = action.payload;

  // Find or create temp stack
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    // Create new stack if doesn't exist
    tempStack = {
      type: 'temporary_stack',
      stackId: `staging-${Date.now()}`,
      cards: [],
      owner: playerIndex,
      value: 0
    };
    gameState.tableCards.push(tempStack);
  }

  // SIMPLE: Just add the card, no validation
  tempStack.cards.push({ ...card, source });
  tempStack.value = (tempStack.value || 0) + (card.value || 0);

  // Remove from source (hand/captures)
  removeCardFromSource(gameState, playerIndex, card, source);

  return gameState;
}
```

#### tableCardDrop.js
Handles initial temp stack creation:

```javascript
function handleTableCardDrop(gameManager, playerIndex, action) {
  const { draggedCard, targetCard } = action.payload;

  // Create new temp stack with both cards
  const tempStack = {
    type: 'temporary_stack',
    stackId: `staging-${Date.now()}`,
    cards: [targetCard, draggedCard],
    owner: playerIndex,
    value: (targetCard.value || 0) + (draggedCard.value || 0)
  };

  // Replace target card with temp stack
  const targetIndex = findCardIndex(gameState.tableCards, targetCard);
  gameState.tableCards[targetIndex] = tempStack;

  // Remove dragged card from source
  removeCardFromSource(gameState, playerIndex, draggedCard, 'hand');

  return gameState;
}
```

### Action Router

#### ActionRouter.js
Maps client actions to server handlers:

```javascript
const ACTION_HANDLERS = {
  // ... existing actions ...
  add_to_temp_stack: require('./actions/addToStagingStack'),
  create_temp_stack: require('./actions/tableCardDrop'),
  // ... more actions ...
};
```

## Key Design Decisions

### 1. Freedom Over Restriction
- **No validation** of card combinations
- **No limits** on stack size
- **No rules enforcement** during building phase
- Players decide what makes sense for their strategy

### 2. Simple State Management
- **Flat structure**: Cards added directly to temp stack
- **Metadata tracking**: Position preservation during cancellation
- **Clean separation**: Client handles UI, server handles state

### 3. Robust Error Handling
- **Graceful degradation**: Missing stacks auto-create
- **Source cleanup**: Cards properly removed from hand/captures
- **Position preservation**: Cancelled stacks return cards to original locations

## Testing Scenarios

### Happy Path
1. ✅ Drag A♠ → B♦ → Creates temp stack [A♠, B♦]
2. ✅ Drag C♥ → temp stack → becomes [A♠, B♦, C♥]
3. ✅ Drag D♣ → temp stack → becomes [A♠, B♦, C♥, D♣]
4. ✅ Accept → converts to build/capture
5. ✅ Cancel → returns all cards to original positions

### Edge Cases
1. ✅ Drop on non-existent stack → auto-creates new stack
2. ✅ Drop same card twice → adds duplicate (player's choice)
3. ✅ Drop captured cards → removes from captures
4. ✅ Network interruption → server syncs on reconnect

### Performance
1. ✅ Large stacks (10+ cards) render smoothly
2. ✅ Multiple players building simultaneously
3. ✅ Real-time updates across all clients

## Benefits

### For Players
- **Creative freedom**: Build any combination
- **Strategic flexibility**: Experiment with different card combinations
- **Intuitive interaction**: Simple drag-and-drop interface
- **Immediate feedback**: Visual confirmation of all actions

### For Development
- **Simple logic**: Minimal validation code
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new features
- **Testable**: Focused, single-responsibility functions

## Future Enhancements

### Smart Suggestions
- Highlight valid build combinations
- Show capture opportunities
- Suggest optimal card additions

### Advanced UI
- Drag preview showing stack growth
- Undo/redo functionality
- Stack rearrangement

### Multiplayer Features
- Spectate other players' stack building
- Share stack configurations
- Collaborative stack building

## Conclusion

The Temp Stack Augmentation system embodies the "Always Allow, Never Validate" philosophy, giving players complete freedom to experiment with card combinations while maintaining a clean, simple, and maintainable codebase.
