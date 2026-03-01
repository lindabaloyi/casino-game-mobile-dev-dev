# Plan: Capture vs Add to Build Modal

## Overview
When player drags a card onto their OWN build, show a modal asking whether to:
- **Add to Build**: Add card to existing build (asserting dominance)
- **Capture**: Capture the build with the card

## Scenario Example
- Player owns Build 10
- Player has another 10 in hand
- Player drags 10 onto their Build 10
- Modal appears: "Add to Build (10)" or "Capture (10)"

## Implementation Steps

### 1. Frontend: Detect when card is dropped on own build
In `GameBoard.tsx`, modify `handleTableDragEnd`:
- Check if target is a build stack owned by current player
- Check if player has another card of same value in hand
- If both true → show modal instead of auto-adding

### 2. Create CaptureOrAddModal component
New modal in `components/table/CaptureOrAddModal.tsx`:
- Shows the card being dragged
- Shows the target build info
- Two buttons: "Add to Build" and "Capture"

### 3. Server: Add new action `addToBuild`
Instead of `addToTemp`, create dedicated action that:
- Adds card to existing build
- Recalculates build value (sum of all cards)
- Does NOT advance turn (player continues)

### 4. Update capture action
Keep existing capture logic - it's already correct

## Files to Modify
1. `components/table/CaptureOrAddModal.tsx` - NEW
2. `components/core/GameBoard.tsx` - Add modal trigger logic
3. `multiplayer/server/game/actions/addToBuild.js` - NEW (or modify addToTemp)
4. `multiplayer/server/game/ActionRouter.js` - Register new action

## Flow Diagram
```
Player drags card → Drop on own build
         ↓
   Has another card of same value?
         ↓
    Yes              No
     ↓                ↓
Show modal     Auto-add to build
     ↓
User selects:
- Add to Build → addToBuild action
- Capture → capture action
```
