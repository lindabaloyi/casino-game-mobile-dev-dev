# GameBoard Performance Optimization Plan

## Current Issues Identified

### 1. Heavy Synchronous Work in Component Body

| Location | Issue | Fix |
|----------|-------|-----|
| Line 465 | `gameState.gameMode \|\| (...)` ternary chain computed every render | Use `useMemo` |
| Line 368 | `computed.table.filter(...)` runs on every render | Move to `useMemo` |
| Line 686 | `gameState.players?.map(p => p.captures?.length \|\| 0)` runs every render | Use `useMemo` |

### 2. Inline Arrow Functions Creating New References

| Location | Issue | Fix |
|----------|-------|-----|
| Line 474-476 | `onTableCardDropOnCard` inline function | Memoize with `useCallback` |
| Line 477 | `onStackDrop` passes `handleDropOnStack` inline | Pass callback directly |
| Line 493-522 | Large `onCapturedCardDragEnd` inline function | Extract to memoized callback |
| Line 523-552 | `onCaptureBuild` inline function | Extract to memoized callback |
| Line 557-559 | `onDropBuildToCapture` inline function | Memoize with `useCallback` |
| Line 584 | `onDropOnStack` inline function | Already uses handleDropOnStack - check |
| Line 585-592 | Multiple inline handlers | Extract and memoize |
| Line 606-609 | `onEndTurn` inline function | Memoize with `useCallback` |
| Line 620-628 | `onShiya` inline function | Memoize with `useCallback` |
| Line 668-674 | `onConfirmTempBuild` inline function | Memoize with `useCallback` |
| Line 692-697 | `onPlayAgain` inline arrow function | Memoize with `useCallback` |
| Line 705-711 | `onQuitGame` inline function | Memoize with `useCallback` |
| Line 712-714 | `onOpponentPress` inline function | Memoize with `useCallback` |
| Line 725-730 | `onSendFriendRequest` inline async function | Memoize with `useCallback` |

### 3. Missing React.memo on Sub-components

Components that should be memoized:
- `GameStatusBar`
- `TableArea`
- `PlayerHandArea`
- `DragGhost`
- `OpponentGhostCard`
- `GameModals`
- `GameOverModal`
- `HomeMenuButton`
- `OpponentProfileModal`
- `ErrorBanner`

### 4. Complex Prop Calculations That Could Be Memoized

| Location | Issue |
|----------|-------|
| Line 450 | `computed.isMyTurn && !(gameState.gameOver \|\| !!gameOverData) && !roundInfo.isOver` - computed inline |
| Line 461 | `gameState.playerCount === 4 && gameState.gameMode === 'party'` - computed every render |
| Line 601-604 | Multiple ternary operations for stack props |
| Line 683 | `(gameState.gameOver \|\| !!gameOverData) \|\| false` - redundant check |

## Optimization Plan

### Phase 1: Add useMemo for Computed Values

```typescript
// Memoize gameMode string
const gameMode = useMemo(() => 
  gameState.gameMode || (
    gameState.playerCount === 2 ? 'two-hands' : 
    gameState.playerCount === 3 ? 'two-hands' : 
    gameState.playerCount === 4 && gameState.players?.some((p: any) => p?.team) ? 'party' : 'freeforall'
  ), 
  [gameState.gameMode, gameState.playerCount, gameState.players]
);

// Memoize build stacks
const buildStacks = useMemo(() => 
  computed.table.filter((tc: any) => tc.type === 'build_stack'),
  [computed.table]
);

// Memoize captured card counts
const capturedCardCounts = useMemo(() => 
  gameState.players?.map(p => p.captures?.length || 0) || [],
  [gameState.players]
);

// Memoize isPartyMode
const isPartyMode = useMemo(() => 
  gameState.playerCount === 4 && gameState.gameMode === 'party',
  [gameState.playerCount, gameState.gameMode]
);

// Memoize showTimer
const showTimer = useMemo(() => 
  computed.isMyTurn && !(gameState.gameOver || !!gameOverData) && !roundInfo.isOver,
  [computed.isMyTurn, gameState.gameOver, gameOverData, roundInfo.isOver]
);
```

### Phase 2: Memoize Callbacks with useCallback

```typescript
// Extract handlers that are currently inline
const handleTableCardDropOnCard = useCallback((card, targetCard) => {
  actions.createTemp(card, targetCard, 'table');
}, [actions]);

const handleCapturedCardDragEnd = useCallback((card, targetCard, targetStackId, source) => {
  dragOverlay.markPendingDrop(card, 'captured');
  if (emitDragEnd) {
    // ... calculation logic
  }
  if (targetCard) {
    actions.createTemp(card, targetCard, source || 'captured');
  } else if (targetStackId) {
    actions.addToTemp(card, targetStackId, source || 'captured');
  }
  dragOverlay.endDrag();
}, [dragOverlay, emitDragEnd, actions]);

const handleCaptureBuild = useCallback((card, stackId, cardSource) => {
  dragOverlay.markPendingDrop(card, 'captured');
  // ... logic
}, [dragOverlay, emitDragEnd, actions, computed.table]);

const handleEndTurn = useCallback(() => {
  modals.hideEndTurnButton();
  actions.endTurn();
}, [modals, actions]);

const handleShiya = useCallback((stackId) => {
  if (shiyaButtonTimerRef.current) {
    clearTimeout(shiyaButtonTimerRef.current);
    shiyaButtonTimerRef.current = null;
  }
  setSelectedBuildForShiya(null);
  actions.shiya(stackId);
}, [actions]);

const handleConfirmTempBuild = useCallback((value) => {
  if (modals.confirmTempBuildStack) {
    actions.setTempBuildValue(modals.confirmTempBuildStack.stackId, value);
    modals.closeConfirmTempBuildModal();
  }
}, [modals, actions]);

const handleQuitGame = useCallback(() => {
  if (onBackToMenu) {
    onBackToMenu();
  }
}, [onBackToMenu]);

const handleOpponentPress = useCallback((playerIndex) => {
  opponentInfo.selectOpponent(playerIndex, gameState.players || []);
}, [opponentInfo, gameState.players]);

const handlePlayAgain = useCallback(() => {
  if (gameState.playerCount === 2 && onRestart) {
    onRestart();
  }
}, [gameState.playerCount, onRestart]);

const handleSendFriendRequest = useCallback(async () => {
  const result = await opponentInfo.sendFriendRequest();
  if (!result.success) {
    console.log('[GameBoard] Failed to send friend request:', result.error);
  }
}, [opponentInfo]);
```

### Phase 3: Add React.memo to Sub-components

For each sub-component, wrap with React.memo:

```typescript
// Example for GameStatusBar
export const GameStatusBar = React.memo(function GameStatusBar(props: GameStatusBarProps) {
  // ... existing code
});
```

Components to memoize:
1. `GameStatusBar`
2. `TableArea` 
3. `PlayerHandArea`
4. `DragGhost`
5. `OpponentGhostCard`
6. `GameModals`
7. `GameOverModal`
8. `HomeMenuButton`
9. `OpponentProfileModal`
10. `ErrorBanner`

### Phase 4: Add React.memo to GameBoard Itself

```typescript
export const GameBoard = React.memo(function GameBoard(props: GameBoardProps) {
  // ... existing code
});
```

**Important**: Ensure props are stable. The main prop that changes frequently is `gameState`, but that's expected. Other props like `sendAction`, `startNextRound`, etc. should remain stable as they're typically passed from parent hooks.

## Execution Order

1. **Phase 1**: Add `useMemo` for computed values (lowest risk, immediate benefit)
2. **Phase 2**: Extract inline callbacks to `useCallback` (medium risk, significant benefit)
3. **Phase 3**: Add `React.memo` to sub-components (requires checking each component)
4. **Phase 4**: Add `React.memo` to GameBoard (test after implementation)

## Testing

After each phase, verify:
- No functionality broken
- Console logs still working
- Drag and drop interactions still smooth
- Modal open/close animations still work

## Expected Performance Improvements

- Reduced re-renders when parent state changes but GameBoard props are stable
- Fewer function allocations per render
- Less garbage collection pressure
- Smoother animations during drag operations
