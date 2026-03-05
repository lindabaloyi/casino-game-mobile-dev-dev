# CPU Game Mode Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CPU Game Mode                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  app/cpu-game.tsx          ← CPU game screen                │
│         │                                                     │
│         ▼                                                     │
│  hooks/game/                                                  │
│  ├── useLocalGame.ts       ← Client-side game state          │
│  │        │                                                 │
│  │        ├── shared/game/ActionRouter.js                   │
│  │        ├── shared/game/GameState.js                      │
│  │        └── shared/game/actions/                          │
│  │                                                      │
│  └── useCpuEngine.ts      ← CPU AI decision making          │
│         │                                                     │
│         ▼                                                     │
│  components/game/GameBoard.tsx                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences from Multiplayer

| Multiplayer | CPU Game |
|-------------|----------|
| Server maintains state | Client maintains state |
| Socket.IO for communication | No network |
| Actions sent to server | Actions executed locally |
| Real-time opponent drag | No opponent drag |

## Implementation Steps

### Step 1: Create useLocalGame Hook

**File**: `hooks/game/useLocalGame.ts`

```typescript
// Concept - imports from shared module
import { createActionRouter } from '../../shared/game/ActionRouter';
import { initializeGame } from '../../shared/game/GameState';
import handlers from '../../shared/game/actions';

export function useLocalGame() {
  // 1. Initialize game with shared function
  const [gameState, setGameState] = useState(() => initializeGame());
  
  // 2. Create ActionRouter with shared handlers
  const actionRouter = useMemo(() => 
    createActionRouter({ handlers }), 
    []
  );
  
  // 3. Execute action locally
  const sendAction = useCallback((action) => {
    const newState = actionRouter.executeAction(
      gameState, 
      currentPlayer,  // 0 = human, 1 = CPU
      action.type, 
      action.payload
    );
    setGameState(newState);
  }, [gameState, currentPlayer]);
  
  return { gameState, sendAction, playerNumber: 0 };
}
```

**Responsibilities**:
- Initialize game state using shared `initializeGame()`
- Execute actions using shared ActionRouter
- Manage state locally (no socket)
- Track whose turn it is

### Step 2: Create useCpuEngine Hook

**File**: `hooks/game/useCpuEngine.ts`

```typescript
export function useCpuEngine(gameState, executeAction) {
  const cpuPlayerIndex = 1;
  
  useEffect(() => {
    // Check if it's CPU's turn
    if (gameState.currentPlayer !== cpuPlayerIndex || gameState.gameOver) {
      return;
    }
    
    // Delay for UX (show "thinking")
    const timeout = setTimeout(() => {
      const action = findBestAction(gameState, cpuPlayerIndex);
      executeAction(action);
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState]);
}
```

**Responsibilities**:
- Monitor when it's CPU's turn
- Use SmartRouter to find valid moves
- Execute CPU move with delay for UX

### Step 3: Create CPU Game Screen

**File**: `app/cpu-game.tsx`

```typescript
export default function CpuGameScreen() {
  const { gameState, sendAction, playerNumber } = useLocalGame();
  useCpuEngine(gameState, sendAction);
  
  return (
    <GameBoard
      gameState={gameState}
      playerNumber={playerNumber}
      sendAction={sendAction}
      isCpuTurn={gameState.currentPlayer === 1}
    />
  );
}
```

### Step 4: Update GameBoard for CPU Indicator

Add `isCpuTurn` prop to GameBoard to show a thinking indicator:

```typescript
interface GameBoardProps {
  // ... existing props
  /** Whether it's the CPU's turn (for thinking indicator) */
  isCpuTurn?: boolean;
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `hooks/game/useLocalGame.ts` | Create |
| `hooks/game/useCpuEngine.ts` | Create |
| `app/cpu-game.tsx` | Create |
| `components/game/GameBoard.tsx` | Modify - add `isCpuTurn` prop |
| `components/game/GameStatusBar.tsx` | Modify - show CPU indicator |

## Testing Checklist

- [ ] Game initializes correctly
- [ ] Human player can make moves
- [ ] CPU automatically takes its turn
- [ ] Turn transitions work (human → CPU → human)
- [ ] Game ends when conditions are met
- [ ] UI shows "CPU thinking" indicator

## Notes

- Reuse existing UI components (GameBoard, etc.)
- The shared module handles all game rules
- CPU engine uses SmartRouter to find valid moves automatically
- Simple AI: find any valid move, execute it
