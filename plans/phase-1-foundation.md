# Phase 1: Foundation & Card Component Organization

## Overview
Phase 1 establishes the foundation for the refactor by:
1. Creating the new directory structure (empty directories for future phases)
2. Organizing card components into their dedicated directory
3. Converting `.js` files to `.tsx` with proper typing
4. Establishing the `types/` directory with shared types

---

## Current State Analysis

### Already in Good Shape
- `components/cards/` - Contains PlayingCard.tsx, DraggableHandCard.tsx ✓
- Card components already follow proper naming convention

### Needs Work
- `components/table/CaptureZone.js` → needs conversion to `.tsx`
- No `types/` directory at root level (types exist in `components/table/types.ts`)
- No `services/`, `context/` root directories
- `components/core/hooks/` - hooks that should move to `hooks/`

---

## Phase 1 Tasks

### Task 1.1: Create Directory Structure
Create empty directories for future phases:

```
src/
├── assets/           # (existing - no change)
├── components/
│   ├── cards/        # (exists - add subdirectories)
│   │   └── components/   # NEW - for card sub-components
│   ├── game/         # NEW - game board specific
│   │   └── components/  # NEW
│   ├── table/        # (exists - add subdirectories)
│   ├── modals/       # NEW - all modals
│   └── shared/       # NEW - shared UI components
├── hooks/
│   ├── game/         # NEW - game-specific hooks
│   ├── drag/         # NEW - drag-and-drop hooks
│   └── ui/           # NEW - UI/device hooks
├── context/          # NEW - React contexts
├── services/
│   ├── socket/       # NEW - socket client/services
│   └── game/         # NEW - game rules/validation
├── types/            # NEW - shared TypeScript types
└── utils/            # NEW - pure utility functions
```

### Task 1.2: Convert CaptureZone.js to .tsx
**File:** `components/table/CaptureZone.js` → `components/table/CaptureZone.tsx`

Required changes:
1. Rename file to `.tsx`
2. Add TypeScript types for props:
   ```typescript
   interface CaptureZoneProps {
     x: number;
     y: number;
     width: number;
     height: number;
     isActive?: boolean;
     onDrop?: (draggedItem: any) => void;
   }
   ```
3. Add proper typing for shared values if possible
4. Remove `any` types where feasible

### Task 1.3: Create Types Directory
Create `types/` at project root and move/merge type definitions:

**New file:** `types/game.types.ts`
- Move game-related types from `components/table/types.ts`
- Add new shared game types

**New file:** `types/card.types.ts`
- Card-related interfaces
- Suit, Rank types

**New file:** `types/index.ts`
- Barrel export for all types

### Task 1.4: Extract Card Sub-Components (Optional for Phase 1)
If any card rendering logic is embedded in larger components, extract to:
- `components/cards/components/` - smaller card-related pieces

---

## Implementation Details

### Task 1.1: Directory Creation Commands
```bash
# Create directories (run from project root)
mkdir -p src/components/cards/components
mkdir -p src/components/game/components
mkdir -p src/components/modals
mkdir -p src/components/shared
mkdir -p src/hooks/game
mkdir -p src/hooks/drag
mkdir -p src/hooks/ui
mkdir -p src/context
mkdir -p src/services/socket
mkdir -p src/services/game
mkdir -p src/types
mkdir -p src/utils
```

### Task 1.2: CaptureZone.tsx Type Definitions
```typescript
// Add to top of file
interface CaptureZoneProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  onDrop?: (draggedItem: DragItem) => void;
}

interface DragItem {
  cardId: string;
  source: 'hand' | 'table' | 'captures';
  // ... other properties
}
```

### Task 1.3: Types Index
```typescript
// types/index.ts
export * from './game.types';
export * from './card.types';
// ...
```

---

## Files to Modify/Update

| File | Action | Notes |
|------|--------|-------|
| `components/table/CaptureZone.js` | Convert to `.tsx` | Add types |
| `components/table/types.ts` | Move to `types/` | Merge into game.types |
| Create `types/game.types.ts` | New | Centralized game types |
| Create `types/card.types.ts` | New | Card type definitions |
| Create `types/index.ts` | New | Barrel exports |

---

## Dependencies & Ordering

1. **First:** Create directory structure
2. **Second:** Convert CaptureZone.js
3. **Third:** Create types directory with shared types
4. **Fourth:** Update imports in files that reference moved types

---

## Success Criteria for Phase 1

- [ ] All new directories created
- [ ] CaptureZone.js converted to CaptureZone.tsx with proper typing
- [ ] `types/` directory created with at least basic game/card types
- [ ] No import errors after refactoring
- [ ] App still builds and runs correctly

---

## Next Phases (Preview)

**Phase 2:** Hook reorganization
- Move hooks from `components/core/hooks/` to `hooks/`
- Organize into game/drag/ui subdirectories

**Phase 3:** Table component organization
- Ensure all table components in `components/table/`
- Create TableArea orchestrator if needed

**Phase 4:** Modal consolidation
- Move modals to `components/modals/`
- Create GameModals orchestrator

**Phase 5:** Game component extraction
- Extract from GameBoard into `components/game/`

---

## Notes
- Phase 1 is intentionally conservative to minimize risk
- Focus on structure and type safety before moving business logic
- Each task can be executed independently after directory creation
