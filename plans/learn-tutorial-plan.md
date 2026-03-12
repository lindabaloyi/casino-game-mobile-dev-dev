# Learn/Tutorial Feature Plan

## Overview
Replace the existing `/explore` page with an interactive tutorial hub featuring animated demonstrations of game mechanics. Tutorials will use actual game board styling with custom scenarios that auto-play to demonstrate core gameplay actions.

## User Requirements
- **Format**: Animated demonstrations that auto-play
- **Scope**: Duel mode primarily (2 players)
- **Visual Style**: Actual game board style

---

## Architecture

### 1. Page Structure
```
app/(tabs)/explore.tsx  →  Tutorial Hub (landing page)
  ├── TutorialCard (each tutorial topic)
  └── → TutorialViewer (modal/screen when tutorial selected)
        ├── MiniGameBoard (simplified game table)
        ├── TutorialStep (current step display)
        └── AnimationController
```

### 2. Data Structure: Tutorial Definition
```typescript
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tableState: TableState;        // Cards, builds on table
  hands: Record<number, Card[]>; // Player hands
  currentPlayer: number;
  action?: {
    type: 'trail' | 'capture' | 'steal' | 'build' | 'dropToCapture';
    source: { player: number; cardIndex?: number; stackId?: string };
    target?: { type: 'loose' | 'build' | 'temp'; rank?: string; suit?: string; stackId?: string };
  };
  animationDelay?: number;        // ms before action plays
  highlightZone?: string;         // UI element to highlight
}

interface Tutorial {
  id: string;
  title: string;
  icon: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: TutorialStep[];
  rules?: string[];              // Optional rule highlights
}
```

---

## Tutorial Topics (Prioritized)

### Level 1: Beginner
| Topic | Description | Key Concepts |
|-------|-------------|--------------|
| **Trail** | Place a card from hand to table | No matching rank on table, card becomes loose |
| **Capture Loose** | Capture identical card from table | Must match rank exactly |
| **Build Temp** | Create a temporary stack | Combine cards to reach target value |

### Level 2: Intermediate
| Topic | Description | Key Concepts |
|-------|-------------|--------------|
| **Capture Build** | Capture a build stack | Match build value, collect all cards |
| **Steal Build** | Add card to opponent's build | Take ownership, transfer to your builds |
| **Merge Builds** | Combine builds with same value | Multiple builds merge into one |

### Level 3: Advanced
| Topic | Description | Key Concepts |
|-------|-------------|--------------|
| **DropToCapture** | Convert temp/build to capture pile | Valid set required, auto-capture |
| **Extend Build** | Add cards to existing build | Pending extension, multi-card |
| **Accept Temp** | Lock in temporary stack | Becomes permanent build |

---

## Implementation Steps

### Step 1: Create Tutorial Data Module
**File**: `shared/game/tutorials/tutorialData.js`
```javascript
// Export tutorial definitions with custom scenarios
// Each tutorial includes pre-configured table states and step-by-step actions

exports.trailTutorial = {
  id: 'trail',
  title: 'How to Trail',
  icon: 'card-outline',
  description: 'Learn to place cards on the table',
  steps: [
    {
      id: 'intro',
      title: 'The Trail Action',
      description: 'When you can\'t capture or build, trail a card to the table.',
      tableState: { cards: [] },
      hands: { 0: [{rank:'5',suit:'♥',value:5}], 1: [{rank:'K',suit:'♠',value:10}] },
      currentPlayer: 0,
    },
    // ... more steps
  ]
};
```

### Step 2: Create Mini Game Board Component
**File**: `components/tutorials/MiniGameBoard.tsx`
- Simplified table layout (not full game board)
- Display only: table cards, player hands at bottom
- Shows 2 players (duel mode)
- Custom card rendering (smaller, static)

### Step 3: Create Tutorial Viewer Component
**File**: `components/tutorials/TutorialViewer.tsx`
- Modal or full-screen overlay
- Step indicator (1/5, 2/5, etc.)
- Play/Pause/Restart controls
- Auto-advance between steps
- Description text for each step

### Step 4: Animation System
**File**: `components/tutorials/AnimationController.ts`
- Card movement animations (hand → table, table → capture pile)
- Highlight effects for active elements
- Timing control (slow/fast playback)
- Step transitions

### Step 5: Update Explore Page
**File**: `app/(tabs)/explore.tsx`
- Replace placeholder content with tutorial grid
- Category sections (Beginner/Intermediate/Advanced)
- Tutorial cards with icons and descriptions

---

## Component Details

### MiniGameBoard Props
```typescript
interface MiniGameBoardProps {
  tableCards: TableItem[];
  hands: Record<number, Card[]>;
  currentPlayer: number;
  activeCard?: { player: number; cardIndex: number };  // Card being played
  captureAnimations?: Animation[];
  style?: ViewStyle;
}
```

### Animation Types
```typescript
type AnimationType = 
  | { type: 'trail'; fromPlayer: number; card: Card }
  | { type: 'capture'; cards: Card[]; toPlayer: number }
  | { type: 'build'; cards: Card[]; stackId: string }
  | { type: 'steal'; fromPlayer: number; toPlayer: number; stackId: string };
```

---

## File Structure
```
components/tutorials/
  ├── TutorialCard.tsx         # Card for tutorial list
  ├── TutorialViewer.tsx        # Main tutorial display
  ├── MiniGameBoard.tsx        # Simplified game table
  ├── MiniCard.tsx             # Small card component
  ├── AnimationController.ts   # Animation orchestration
  └── index.ts                 # Exports

shared/game/tutorials/
  ├── tutorialData.js          # All tutorial definitions
  └── index.js                 # Exports

app/(tabs)/
  └── explore.tsx              # Updated tutorial hub
```

---

## Example Tutorial Scenario: Trail

### Step 1: Initial State
```
Table: [5♠, 9♥]
Player 0 Hand: [K♠]
Player 1 Hand: [3♦]
```
**Description**: "You have a King in hand. There's no matching card or build to capture."

### Step 2: Action
```
Animation: K♠ moves from Player 0 hand → Table
Table: [5♠, 9♥, K♠]
```
**Description**: "Trail your King to the table. Note: you cannot have duplicate ranks!"

### Step 3: Complete
```
Turn advances to Player 1
```
**Description**: "Trail ends your turn. Now Player 1 plays."

---

## Visual Specifications

### Color Scheme
- Use existing game colors (green table, card suits)
- Highlight animations: Yellow glow (#FFD700, 50% opacity)
- Active player indicator: Pulsing border

### Card Display
- Mini cards: 40x56 px (scaled from 60x84)
- Build stacks: Vertical card pile with value badge
- Temp stacks: Horizontal card row with target value

### Animations
- Card movement: 500ms ease-in-out
- Highlight pulse: 1000ms infinite
- Step transition: 300ms fade

---

## Implementation Order

1. **Phase 1**: Core Infrastructure
   - Create `shared/game/tutorials/tutorialData.js` with 3 beginner tutorials
   - Create `MiniCard.tsx` component
   - Create `MiniGameBoard.tsx` component

2. **Phase 2**: Viewer & Animation
   - Create `TutorialViewer.tsx`
   - Create `AnimationController.ts`
   - Wire up auto-play functionality

3. **Phase 3**: UI Integration
   - Update `app/(tabs)/explore.tsx`
   - Add tutorial categories
   - Add navigation from cards to viewer

4. **Phase 4**: Content Expansion
   - Add intermediate tutorials
   - Add advanced tutorials
   - Add party mode tutorials (optional)

---

## Notes
- Tutorials use mock state (not actual game state)
- No interaction required - purely demonstrative
- Can be extended to party mode later
- Consider adding "Try it yourself" mode after demo completes
