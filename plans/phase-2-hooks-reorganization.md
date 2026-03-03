# Phase 2: Hook Reorganization

## Overview
Phase 2 reorganizes hooks by domain, moving them from `components/core/hooks/` to the appropriate subdirectories in `hooks/`.

---

## Current State

### Root `hooks/` Directory (Already Exists)
| File | Size | Purpose |
|------|------|---------|
| `useDrag.ts` | 9955 chars | Core drag-and-drop logic |
| `useGameState.ts` | 8927 chars | Main game state management |
| `use-color-scheme.ts` | 48 chars | Theme detection |
| `use-theme-color.ts` | 558 chars | Theme colors |

### `components/core/hooks/` (Need to Move)
| File | Size | Proposed Destination |
|------|------|---------------------|
| `useDragOverlay.ts` | 2150 chars | `hooks/drag/useDragOverlay.ts` |
| `useGameActions.ts` | 4820 chars | `hooks/game/useGameActions.ts` |
| `useModalManager.ts` | 2165 chars | `hooks/game/useModalManager.ts` |
| `useStealDetection.ts` | 1296 chars | `hooks/game/useStealDetection.ts` |

### Empty Directories (Created in Phase 1)
- `hooks/game/` 
- `hooks/drag/`
- `hooks/ui/`

---

## Phase 2 Tasks

### Task 2.1: Move Game Hooks to `hooks/game/`

Move files from `components/core/hooks/` to `hooks/game/`:
- `useGameActions.ts` → `hooks/game/useGameActions.ts`
- `useModalManager.ts` → `hooks/game/useModalManager.ts`
- `useStealDetection.ts` → `hooks/game/useStealDetection.ts`

### Task 2.2: Move Drag Hooks to `hooks/drag/`

Move from `components/core/hooks/`:
- `useDragOverlay.ts` → `hooks/drag/useDragOverlay.ts`

Note: `hooks/useDrag.ts` already exists at root - this is the core drag hook.

### Task 2.3: Update All Import Statements

Find and update all imports that reference the old paths:
- `components/core/hooks/useGameActions.ts` → `hooks/game/useGameActions.ts`
- `components/core/hooks/useModalManager.ts` → `hooks/game/useModalManager.ts`
- `components/core/hooks/useStealDetection.ts` → `hooks/game/useStealDetection.ts`
- `components/core/hooks/useDragOverlay.ts` → `hooks/drag/useDragOverlay.ts`

### Task 2.4: Delete Empty Directory

Remove `components/core/hooks/` when empty.

---

## Files That Need Import Updates

Based on the original file tree, these files likely import from `components/core/hooks/`:

1. **GameBoard.tsx** - likely imports useGameActions, useModalManager
2. **Other components** - may import useDragOverlay, useStealDetection

Run search to find all imports:
```bash
# Search for imports from components/core/hooks
grep -r "components/core/hooks" --include="*.tsx" --include="*.ts"
```

---

## Proposed Hook Organization After Phase 2

```
hooks/
├── useDrag.ts              # Core drag (stays at root)
├── useGameState.ts         # Game state (stays at root)
├── use-color-scheme.ts    # Theme (stays at root)
├── use-theme-color.ts     # Theme (stays at root)
│
├── game/                  # NEW - Game-specific hooks
│   ├── useGameActions.ts  # MOVED from components/core/hooks/
│   ├── useModalManager.ts # MOVED from components/core/hooks/
│   └── useStealDetection.ts # MOVED from components/core/hooks/
│
├── drag/                  # NEW - Drag-and-drop hooks
│   └── useDragOverlay.ts  # MOVED from components/core/hooks/
│
└── ui/                   # NEW - UI/Device hooks
    └── (future hooks)
```

---

## Success Criteria

- [ ] All hooks moved to appropriate domain directories
- [ ] All import statements updated
- [ ] No import errors after refactoring
- [ ] App builds and runs correctly

---

## Next Phases (Preview)

**Phase 3:** Table Component Organization
- Ensure all table components in `components/table/`
- Review TableArea orchestrator

**Phase 4:** Modal Consolidation
- Move modals to `components/modals/`
- Create GameModals orchestrator

**Phase 5:** Game Component Extraction
- Extract from GameBoard into `components/game/`
- Create DragGhost component

---

## Notes
- Phase 2 is straightforward file moves with import updates
- No logic changes - just reorganization
- Test after each move to catch import issues early
