# Remove Recall Button from Action Strip

## Goal
Remove the Recall button from PlayerHandArea action strip. The ShiyaRecallModal will handle recalls automatically when a teammate captures your Shiya build.

## Changes Required

### 1. PlayerHandArea.tsx
- Remove Recall button (lines 326-339)
- Remove `availableRecalls` and `onRecall` props from interface and component
- Update condition on line 289 to remove `availableRecalls` check

### 2. GameBoard.tsx  
- Remove `availableRecalls` computed value (no longer passed to PlayerHandArea)
- Remove passing `availableRecalls` and `onRecall` props to PlayerHandArea
- Keep ShiyaRecallModal - it works automatically via useEffect detection

## Files to Modify
- `components/game/PlayerHandArea.tsx`
- `components/game/GameBoard.tsx`
