# SetTempBuildValueModal - Implementation Plan

## Task Overview
Create a new modal component for setting the base value on a temp stack. The modal should look exactly like `StealBuildModal.tsx` but with purple color scheme instead of red.

## Current State
- `setTempBuildValue.js` is a server-side action that directly sets the value
- Need to create a client-side modal that:
  - Shows current temp stack cards
  - Allows player to select a target value
  - Calls `setTempBuildValue` action

## Design Reference
`StealBuildModal.tsx` has:
1. ModalSurface container with "Steal Build" title
2. Card display row (build cards + hand card)
3. Value display ("New value: X")
4. Pulsing confirm button with glow effect
5. Cancel button

## Purple Color Mapping (from red theme)
| Element | Red Theme | Purple Theme |
|---------|-----------|--------------|
| Background | `#4a1a1a` | `#2d1b4e` (deep purple) |
| Border | `#dc2626` | `#7c3aed` (purple) |
| Plus sign | `#c0392b` | `#9333ea` |
| Value text (gold) | `#fbbf24` | `#fbbf24` (keep gold) |
| Button glow | `#e74c3c` | `#a855f7` |
| Button bg | `#b91c1c` | `#7c3aed` |
| Button border | `#ef4444` | `#a78bfa` |
| Ghost border | `rgba(255,100,100,0.15)` | `rgba(167,139,250,0.15)` |
| Ghost text | `#9b5555` | `#9d7bb8` |

## Implementation Steps

### Step 1: Create SetTempBuildValueModal.tsx
Create new file in `components/modals/SetTempBuildValueModal.tsx`

**Props needed:**
```typescript
interface SetTempBuildValueModalProps {
  visible: boolean;
  tempStack: {
    stackId: string;
    cards: Card[];
    value: number;
    owner: number;
  };
  playerNumber: number;
  playerCount?: number;
  isPartyMode?: boolean;
  /** Available target values (typically 1-10) */
  availableValues?: number[];
  onConfirm: (value: number) => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}
```

### Step 2: Handle Edge Cases
1. **No temp stack**: Modal shouldn't appear if no temp stack exists
2. **Already fixed**: If `baseFixed` is true, modal shouldn't allow re-selection
3. **Not owner**: Only stack owner should be able to see/use modal
4. **Stale state**: If stack was captured/cancelled, modal should auto-dismiss

### Step 3: Integration
- Add modal to game board component
- Connect to `pendingChoice` or similar state for showing modal
- Pass `setTempBuildValue` action through useGameActions hook

## File Structure
```
components/modals/
  SetTempBuildValueModal.tsx  (NEW - purple themed)
```

## Key Design Decisions
1. **Use existing purple colors from design system**: 
   - Primary: `#7c3aed` 
   - Border: `#a78bfa`
   - Glow: `#a855f7`

2. **Keep same layout/spacing as StealBuildModal** for consistency

3. **Value selection**: Should show buttons for available values (1-10) or use a picker

## Testing Checklist
- [ ] Modal appears when player taps temp stack
- [ ] Correct cards displayed in card row
- [ ] Available values shown correctly
- [ ] Confirm with value calls setTempBuildValue action
- [ ] Cancel closes modal without action
- [ ] Works with 2, 3, and 4 player games
- [ ] Works in party mode with team colors