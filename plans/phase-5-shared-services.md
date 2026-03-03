# Phase 5: Shared UI Components & Services Organization

## Overview
Phase 5 organizes shared UI components and creates the services directory structure.

---

## Current State

### `components/shared/` - Already Created (Empty)
This directory is ready for shared UI components.

### `services/` - Already Created (Empty)
This directory is ready for services.

### `components/ui/` - Existing
| File | Description |
|------|-------------|
| `collapsible.tsx` | Collapsible component |
| `external-link.tsx` | External link component |
| `haptic-tab.tsx` | Haptic tab component |
| `hello-wave.tsx` | Hello wave component |
| `icon-symbol.ios.tsx` | iOS icon |
| `icon-symbol.tsx` | Icon component |

---

## Phase 5 Tasks

### Task 5.1: Organize Shared UI Components

Move generic UI components to `components/shared/`:
- Create barrel exports for shared components

### Task 5.2: Create Services Structure

Create service files in `services/`:
- `services/socket/client.ts` - Socket client (placeholder)
- `services/game/rules.ts` - Game rules
- `services/game/validation.ts` - Game validation

### Task 5.3: Create Context Structure

Review `components/core/context/`:
- Keep or move to `context/` root directory

---

## File Structure After Phase 5

```
components/
├── cards/           # Card components
├── core/           # GameBoard components
├── game/           # GameModals
├── modals/         # All modals
├── shared/         # Shared UI components (NEW)
├── table/          # Table components
├── themed/         # Theme components
└── ui/            # UI components

context/            # NEW - React contexts
├── GameBoardContext.tsx  (move from core/context)

services/            # NEW
├── socket/
│   └── client.ts
└── game/
    ├── rules.ts
    └── validation.ts

hooks/
├── useDrag.ts
├── useGameState.ts
├── game/
└── drag/

types/
├── card.types.ts
├── game.types.ts
└── index.ts
```

---

## Success Criteria

- [ ] Shared UI components organized
- [ ] Services directory structure created
- [ ] TypeScript compilation passes
- [ ] App builds correctly
