# Phase 3: Table Component & Modal Organization

## Overview
Phase 3 consolidates modals into a dedicated directory and reviews table component organization.

---

## Current State

### `components/table/` - Existing Files
| File | Category | Status |
|------|----------|--------|
| `BuildStackView.tsx` | Table | ✅ Already in correct location |
| `CapturedCardsView.tsx` | Table | ✅ Already in correct location |
| `CaptureZone.tsx` | Table | ✅ Already in correct location |
| `DraggableLooseCard.tsx` | Cards | ✅ Already in correct location |
| `DraggableTableCard.tsx` | Cards | ✅ Already in correct location |
| `StackActionStrip.tsx` | Table | ✅ Already in correct location |
| `StackCardPair.tsx` | Table | ✅ Already in correct location |
| `TableArea.tsx` | Table | ✅ Already in correct location (orchestrator) |
| `TempStackOverlay.tsx` | Table | ✅ Already in correct location |
| `TempStackView.tsx` | Table | ✅ Already in correct location |
| **`CaptureOrAddModal.tsx`** | Modal | → Move to `components/modals/` |
| **`ExtendBuildModal.tsx`** | Modal | → Move to `components/modals/` |
| **`PlayOptionsModal.tsx`** | Modal | → Move to `components/modals/` |
| **`StealBuildModal.tsx`** | Modal | → Move to `components/modals/` |
| `types.ts` | Types | ⚠️ Consider removing (use shared `types/`) |

---

## Phase 3 Tasks

### Task 3.1: Move Modals to `components/modals/`

Move these files:
- `components/table/CaptureOrAddModal.tsx` → `components/modals/CaptureOrAddModal.tsx`
- `components/table/ExtendBuildModal.tsx` → `components/modals/ExtendBuildModal.tsx`
- `components/table/PlayOptionsModal.tsx` → `components/modals/PlayOptionsModal.tsx`
- `components/table/StealBuildModal.tsx` → `components/modals/StealBuildModal.tsx`

### Task 3.2: Update Import Paths

Update imports in:
- `components/core/GameBoard.tsx` - update modal import paths

### Task 3.3: Update Shared Types Usage

Option A: Keep `components/table/types.ts` for backward compatibility (re-export from shared types)
Option B: Remove and update all imports to use `types/`

---

## File Changes Summary

### Files to Move
| Source | Destination |
|--------|-------------|
| `components/table/CaptureOrAddModal.tsx` | `components/modals/CaptureOrAddModal.tsx` |
| `components/table/ExtendBuildModal.tsx` | `components/modals/ExtendBuildModal.tsx` |
| `components/table/PlayOptionsModal.tsx` | `components/modals/PlayOptionsModal.tsx` |
| `components/table/StealBuildModal.tsx` | `components/modals/StealBuildModal.tsx` |

### Files to Update
| File | Change |
|------|--------|
| `components/core/GameBoard.tsx` | Update modal import paths |

---

## Success Criteria

- [ ] All modals moved to `components/modals/`
- [ ] All imports updated
- [ ] TypeScript compilation passes
- [ ] App builds and runs correctly

---

## Next Phases (Preview)

**Phase 4:** Game Component Extraction
- Extract DragGhost from GameBoard
- Create GameModals orchestrator
- Move shared UI components to `components/shared/`

**Phase 5:** Context & Services Organization
- Create `context/` directory with providers
- Create `services/` directory structure
