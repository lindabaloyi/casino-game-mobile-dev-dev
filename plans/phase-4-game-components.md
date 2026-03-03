# Phase 4: Game Component Extraction & GameModals Orchestrator

## Overview
Phase 4 renames `core` to `game` for clarity and creates a GameModals orchestrator component to clean up GameBoard.

---

## Current State

### `components/core/` - Files to Rename
| File | Size | Proposed Action |
|------|------|-----------------|
| `GameBoard.tsx` | 23KB | Keep, move to `components/game/` |
| `GameStatusBar.tsx` | 1.5KB | Keep, move to `components/game/` |
| `OpponentGhostCard.tsx` | 5.8KB | Keep, move to `components/game/` |
| `PlayerHandArea.tsx` | 4.4KB | Keep, move to `components/game/` |
| `context/` | - | Move to `components/game/context/` |

### `components/modals/` - Current
| File | Status |
|------|--------|
| `CaptureOrAddModal.tsx` | ✅ Already in place |
| `ExtendBuildModal.tsx` | ✅ Already in place |
| `PlayOptionsModal.tsx` | ✅ Already in place |
| `StealBuildModal.tsx` | ✅ Already in place |

---

## Phase 4 Tasks

### Task 4.1: Rename `components/core/` to `components/game/`

Rename directory:
- `components/core/` → `components/game/`

### Task 4.2: Create `GameModals.tsx` Orchestrator

Create new file: `components/game/GameModals.tsx`

This component will wrap all modal rendering, keeping GameBoard clean:

```typescript
interface GameModalsProps {
  // Play modal
  showPlayModal: boolean;
  selectedTempStack: TempStack | null;
  playerHand: Card[];
  onConfirmPlay: (buildValue: number) => void;
  onCancelPlay: () => void;
  
  // Steal modal
  showStealModal: boolean;
  stealTargetCard: Card | null;
  stealTargetStack: BuildStack | null;
  playerNumber: number;
  onConfirmSteal: () => void;
  onCancelSteal: () => void;
  
  // Extend modal (optional - may not be used in drag-drop)
  showExtendModal?: boolean;
  extendTargetBuild?: BuildStack | null;
}

export function GameModals(props: GameModalsProps) {
  // Render all modals conditionally
}
```

### Task 4.3: Update Import Paths

Update all imports from `components/core/*` to `components/game/*`:
- `app/*.tsx` files that import GameBoard

---

## File Changes Summary

| Source | Destination |
|--------|-------------|
| `components/core/GameBoard.tsx` | `components/game/GameBoard.tsx` |
| `components/core/GameStatusBar.tsx` | `components/game/GameStatusBar.tsx` |
| `components/core/OpponentGhostCard.tsx` | `components/game/OpponentGhostCard.tsx` |
| `components/core/PlayerHandArea.tsx` | `components/game/PlayerHandArea.tsx` |
| `components/core/context/GameBoardContext.ts` | `components/game/context/GameBoardContext.ts` |
| (NEW) | `components/game/GameModals.tsx` |

---

## Success Criteria

- [ ] `components/core/` renamed to `components/game/`
- [ ] `GameModals.tsx` created as orchestrator
- [ ] All imports updated
- [ ] TypeScript compilation passes
- [ ] App builds and runs correctly

---

## Next Phases (Preview)

**Phase 5:** Shared UI Components
- Move generic UI components to `components/shared/`
- Create barrel exports for clean imports

**Phase 6:** Services & Context Organization
- Create `services/` directory structure
- Create `context/` directory with providers
