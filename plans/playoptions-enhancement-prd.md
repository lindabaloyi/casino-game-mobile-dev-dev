# PlayOptionsModal Enhancement PRD
## Product Requirements Document

---

## Overview

**Enhance the PlayOptionsModal** to show all valid build options when a player accepts a temp stack. Currently, the modal only shows basic sum/diff options. This enhancement will:

1. Detect all possible build values (sum, base, same-rank)
2. Add intelligent build hint calculation
3. Show multiple options when applicable (e.g., 4+4 shows both "Build 8" and "Build 4")
4. Restore party mode team build support

---

## Background

When a player creates a temp stack (e.g., by combining 4♠ + 4♥), they should be able to accept it as:
- **Build 8 (sum)** - treating 4+4 as sum
- **Build 4 (base)** - treating 4 as the base (diff build)

The current implementation only shows one option based on simple logic, not allowing players to choose between these valid interpretations.

---

## Requirements

### 1. Create Build Hint Utility (`getBuildHint`)

**Location:** `utils/buildCalculator.ts` (new file)

**Purpose:** Calculate all possible build values from a set of cards

**Function Signature:**
```typescript
interface BuildHint {
  value: number;      // Target build value
  need: number;       // Card value needed to complete (0 if complete)
  isComplete: boolean;
  type: 'sum' | 'diff' | 'single';
}

function getBuildHint(cardValues: number[]): BuildHint | null
```

**Logic:**
- **Sum builds:** If total <= 10, value = total, need = 0
- **Diff builds:** If total > 10, value = largest card, need = largest - sum(others)
- **Same-rank builds:** If all cards same rank, can build that rank value
- Return all possible values player can build

### 2. Update PlayOptionsModal

**Location:** `components/modals/PlayOptionsModal.tsx`

**Changes:**

#### 2.1 Add Import
```typescript
import { getBuildHint } from '../../utils/buildCalculator';
```

#### 2.2 Update Props Interface
```typescript
interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  // NEW: Team build support for party mode
  teamCapturedBuilds?: { 
    [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[] 
  };
  playerNumber?: number;
  onConfirm: (buildValue: number, originalOwner?: number) => void;
  onCancel: () => void;
}
```

#### 2.3 Calculate All Possible Build Values
Replace simple calculation with:
```typescript
// Get all possible build values using getBuildHint
const cardValues = cards.map(c => c.value);
const hint = getBuildHint(cardValues);

// Collect all possible values
const possibleValues = new Set<number>();

if (hint) {
  possibleValues.add(hint.value);  // Main value
  if (hint.need > 0) {
    possibleValues.add(hint.need);  // Card needed to complete
  }
}

// Add same-rank values
const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
if (allSameRank) {
  possibleValues.add(cards[0].value);  // Can build as single rank
}
```

#### 2.4 Show All Valid Options
Display ALL possible build values, not just ones player has cards for:
```typescript
{Array.from(possibleValues).map(value => (
  <TouchableOpacity 
    key={value}
    onPress={() => onConfirm(value)}
  >
    <Text>Build {value}</Text>
  </TouchableOpacity>
))}
```

### 3. Update GameModals

**Location:** `components/game/GameModals.tsx`

**Changes:**
```typescript
interface GameModalsProps {
  // ... existing props
  // ADD:
  teamCapturedBuilds?: { [playerIndex: number]: any[] };
  playerNumber?: number;
}

// Pass to PlayOptionsModal:
<PlayOptionsModal
  // ... existing props
  teamCapturedBuilds={teamCapturedBuilds}
  playerNumber={playerNumber}
/>
```

### 4. Update GameBoard

**Location:** `components/game/GameBoard.tsx`

**Changes:**
- Pass `teamCapturedBuilds` from gameState to GameModals
- Pass `playerNumber` to GameModals

---

## Implementation Steps

### Step 1: Create Build Calculator Utility
- File: `utils/buildCalculator.ts`
- Implement `getBuildHint` function
- Handle: sum builds, diff builds, same-rank builds

### Step 2: Update PlayOptionsModal
- Import getBuildHint
- Calculate all possible build values
- Display all valid options
- Add teamCapturedBuilds prop support

### Step 3: Update GameModals
- Add teamCapturedBuilds and playerNumber to props
- Pass through to PlayOptionsModal

### Step 4: Update GameBoard
- Pass teamCapturedBuilds from gameState
- Pass playerNumber to GameModals

### Step 5: Testing
- Test sum builds (e.g., 3+2 = 5)
- Test diff builds (e.g., 8+3 = base 8, need 5)
- Test same-rank builds (e.g., 4+4 = 4 or 8)
- Test party mode team builds

---

## UI Mockup

```
┌─────────────────────────────────┐
│         Build Options            │
│   Use stack to build the         │
│   following:                     │
│                                  │
│   [4♠] [4♥] +                  │
│   Total: 8                      │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Build 8 (sum)          │   │ ← NEW: Sum option
│   └─────────────────────────┘   │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Build 4 (base)         │   │ ← NEW: Base option  
│   └─────────────────────────┘   │
│                                  │
│   ┌─────────────────────────┐   │
│   │ Build 4 (single)        │   │ ← NEW: Same-rank option
│   └─────────────────────────┘   │
│                                  │
│   [Cancel]                      │
└─────────────────────────────────┘
```

---

## Edge Cases

| Scenario | Input | Expected Outputs |
|----------|-------|-----------------|
| Sum build | 3+2 | 5 (sum) |
| Diff build | 8+3 | 8 (base), need 5 |
| Same rank | 4+4 | 8 (sum), 4 (base), 4 (single) |
| Triple same | 5+5+5 | 15 (sum), 5 (base), 5 (single) |
| Incomplete | 8+2 | 10 (sum), 8 (base), need 6 |

---

## Files to Modify

| File | Changes |
|------|---------|
| `utils/buildCalculator.ts` | NEW - Build hint utility |
| `components/modals/PlayOptionsModal.tsx` | Use getBuildHint, show all options |
| `components/game/GameModals.tsx` | Add teamCapturedBuilds props |
| `components/game/GameBoard.tsx` | Pass teamCapturedBuilds to modals |

---

## Acceptance Criteria

1. ✅ For 4+4, modal shows both "Build 8" and "Build 4" options
2. ✅ For 3+2, modal shows "Build 5" option (sum)
3. ✅ For 8+3, modal shows "Build 8" option (diff/base)
4. ✅ For 5+5+5, modal shows "Build 15", "Build 5" options
5. ✅ Player can select any valid build value
6. ✅ Party mode team builds work (teamCapturedBuilds)
7. ✅ Backend acceptTemp correctly processes chosen value
