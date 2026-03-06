# KISS Round Transition Plan

## Goal
Remove all round transition modals and make the game flow automatically:
- Round 1 → Round 2 (automatic, no modal)
- Round 2 → Game Over (show modal)

## Target Flow
```
Round 1 playing
↓ (all cards played)
Round 1 end detected
↓ (automatic)
Start Round 2 - deal 10 cards each
↓ (reset round state)
Round 2 playing
↓ (all cards played)
Round 2 end detected
↓ (automatic)
Game Over Modal
```

## Changes Required

### 1. GameBoard.tsx - Remove RoundEndModal
- Remove import of RoundEndModal
- Remove `showRoundEnd` state
- Remove RoundEndModal rendering
- Modify round end detection to auto-transition

### 2. useGameRound.ts - Add Round End Handler
When round ends:
- If round === 1: Call startNextRound()
- If round === 2: Set gameOver flag

### 3. Keep Auto-Transition
The server already auto Server Side --transitions between rounds. This is correct.

## Implementation Steps

### Step 1: Update GameBoard.tsx
Remove RoundEndModal and showRoundEnd logic:
```typescript
// Remove:
const [showRoundEnd, setShowRoundEnd] = useState(false);

// Remove showRoundEnd effect

// Replace round end detection with auto-transition:
// If round 1 ends → start round 2
// If round 2 ends → show game over
```

### Step 2: Update useGameRound.ts
Add callback for round end that handles transition:
```typescript
interface RoundInfo {
  // ... existing
  onRoundEnd?: (round: number) => void;
}
```

### Step 3: Handle in GameBoard
When round ends:
- Check current round number
- If round 1: auto-call startNextRound()
- If round 2: show GameOverModal

## Key Principle
**Single Source of Truth**: The round state is in the gameState. When it changes to indicate round end:
- Read current round number
- Decide what to do based on round number
- No intermediate modal states needed
