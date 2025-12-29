# Contact-Based Card System Refactor

## 🎯 **REFRACTOR OVERVIEW**

This document outlines the comprehensive refactor from the complex drop-zone priority system to a simple, intuitive contact-based card interaction system for the casino game.

### **Why Contact-Based?**
- **Natural UX**: Players drag cards to where they want them - no invisible zones
- **Reliable**: No complex bounds calculations, timing issues, or priority conflicts
- **Maintainable**: Simple logic - "what card is closest to the drop point?"
- **Performance**: No global registry, no continuous measurements, no zone management

---

## 📋 **CURRENT SYSTEM ANALYSIS**

### **1. Game State Structure**

```typescript
// From multiplayer/server/game-logic/game-state.ts
export interface Card {
  suit: string;        // '♠', '♥', '♦', '♣'
  rank: string;        // 'A', '2'-'10'
  value: number;       // 1-10 (A=1, 2-10=face value)
  source?: string;     // 'hand', 'table', 'captured' (for temp stacks)
}

export interface Build {
  buildId: string;     // Unique ID: 'build-1767035740479-0rym5i2sx'
  type: 'build';
  cards: Card[];
  value: number;       // Build value (sum of cards)
  owner: number;       // Player index (0 or 1)
  isExtendable: boolean;
}

export interface TemporaryStack {
  stackId: string;     // Unique ID: 'temp-1767035736722-d5g257iub'
  type: 'temporary_stack';
  cards: Card[];
  owner: number;
  value: number;       // Sum of card values
  createdAt: number;   // Timestamp
  // Build augmentation fields:
  isBuildAugmentation?: boolean;
  targetBuildId?: string;
  targetBuildValue?: number;
}

export type TableCard = Card | TemporaryStack | Build;

export interface GameState {
  deck: Card[];
  playerHands: Card[][];      // [player0Cards[], player1Cards[]]
  tableCards: TableCard[];    // All cards on table
  playerCaptures: Card[][][]; // [player0Captures[], player1Captures[]]
  currentPlayer: number;      // 0 or 1
  round: number;
  scores: number[];
  gameOver: boolean;
  winner: number | null;
  lastCapturer: number | null;
  scoreDetails: any;
}
```

### **2. Current Rendering Components**

#### **TableCards.tsx** - Main table renderer
- Renders all table cards (loose, builds, temp stacks)
- Handles position preservation for cancelled stacks
- Uses `getCardType()` helper for union type checking
- Position mapping with z-index calculation

#### **BuildCardRenderer.tsx** - Build-specific renderer
- Renders individual builds with drop zones
- Uses `buildItem.buildId` as stackId (✅ correct)
- Handles build augmentation drops

#### **TempStackRenderer.tsx** - Temporary stack renderer
- Renders staging stacks with Accept/Cancel overlays
- Handles staging validation and finalization

#### **TableDraggableCard.tsx** - Loose card renderer
- Individual loose cards with drag/drop support
- Drop zone registration for loose cards

### **3. Current Action Dispatch System**

#### **Action Format:**
```typescript
// Standard action structure
const action = {
  type: 'actionName',        // e.g., 'capture', 'createBuildFromTempStack'
  payload: {
    // Action-specific data
    card?: Card,
    buildId?: string,
    stackId?: string,
    // ... other fields
  }
};

// Examples:
const captureAction = {
  type: 'capture',
  payload: {
    draggedItem: { card: Card, source: 'hand' },
    selectedTableCards: [targetCard],
    targetCard: targetCard
  }
};

const buildAction = {
  type: 'createBuildFromTempStack',
  payload: {
    tempStackId: 'temp-xxx',
    buildValue: 9
  }
};

const augmentationAction = {
  type: 'addToBuilding',
  payload: {
    buildId: 'build-xxx',
    card: Card,
    source: 'hand'
  }
};
```

#### **Action Flow:**
1. **Client** calls `sendAction(action)`
2. **Socket** sends to server
3. **Server** routes via `ActionRouter.js`
4. **Handler** processes action and updates `GameState`
5. **Server** broadcasts updated state to all clients
6. **Client** receives state update and re-renders

### **4. Current Drag System Problems**

#### **Complex Drop Zone System:**
- **Global Registry**: `(global as any).dropZones[]`
- **Bounds Measurement**: `measureInWindow()` calls
- **Priority System**: BUILD (1000) > TEMP (900) > LOOSE (100) > TRAIL (0)
- **Race Conditions**: Registration timing issues
- **ID Mismatches**: Wrong IDs used for drop zones

#### **Current Issues:**
1. **Build drop zones fail** due to timing/registration issues
2. **Complex priority logic** causes wrong zone selection
3. **Bounds calculations** fail with dynamic layouts
4. **ID confusion** between render indices and actual build IDs

---

## 🎯 **NEW CONTACT-BASED SYSTEM**

### **Core Architecture**

#### **1. Position Tracker**
```typescript
// Simple global position registry
interface CardPosition {
  id: string;              // buildId or card identifier
  x: number;               // Screen X coordinate
  y: number;               // Screen Y coordinate
  width: number;           // Card/build width
  height: number;          // Card/build height
  type: 'card' | 'build';  // What type of element
  buildId?: string;        // For build cards
}

const cardPositions = new Map<string, CardPosition>();

// Update position when component renders
function reportCardPosition(id: string, position: CardPosition) {
  cardPositions.set(id, position);
}
```

#### **2. Contact Detector**
```typescript
// Find closest card/build to drop point
function findTouchedCard(dropX: number, dropY: number): {
  id: string;
  type: 'card' | 'build';
  distance: number;
  position: CardPosition;
} | null {

  let closest = null;
  let minDistance = Infinity;

  for (const [id, position] of cardPositions) {
    // Calculate distance from drop point to card center
    const centerX = position.x + position.width / 2;
    const centerY = position.y + position.height / 2;
    const distance = Math.sqrt(
      Math.pow(dropX - centerX, 2) +
      Math.pow(dropY - centerY, 2)
    );

    // Only consider cards within reasonable distance
    if (distance < 100 && distance < minDistance) {
      minDistance = distance;
      closest = { id, type: position.type, distance, position };
    }
  }

  return closest;
}
```

#### **3. Action Determiner**
```typescript
// Determine action based on dragged card and touched target
function determineAction(
  draggedCard: Card,
  touchedId: string,
  touchedType: 'card' | 'build'
): Action {

  if (touchedType === 'card') {
    // Loose card - check for capture or build creation
    const tableCard = findTableCardById(touchedId);

    // Same value = capture
    if (draggedCard.value === tableCard.value) {
      return {
        type: 'capture',
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          selectedTableCards: [tableCard],
          targetCard: tableCard
        }
      };
    }

    // Different values = potential build
    const buildValue = draggedCard.value + tableCard.value;
    if (buildValue <= 10) {
      return {
        type: 'createBuildFromTempStack', // Via staging first
        payload: {
          // Create staging stack first, then build
          source: 'hand',
          card: draggedCard,
          targetIndex: findCardIndex(tableCard),
          isTableToTable: false
        }
      };
    }

  } else if (touchedType === 'build') {
    // Build - augmentation
    const build = findBuildById(touchedId);

    if (build.owner === currentPlayer) {
      return {
        type: 'addToBuilding',
        payload: {
          buildId: touchedId,
          card: draggedCard,
          source: 'hand'
        }
      };
    }
  }

  // No valid contact - trail
  return {
    type: 'trail',
    payload: { card: draggedCard }
  };
}
```

### **New Component Structure**

#### **1. Position Reporting Components**

```jsx
// BuildCardRenderer.tsx - Update to report position
React.useEffect(() => {
  stackRef.current?.measureInWindow((x, y, width, height) => {
    reportCardPosition(buildItem.buildId, {
      id: buildItem.buildId,
      x, y, width, height,
      type: 'build',
      buildId: buildItem.buildId
    });
  });
}, [buildItem.buildId]);

// TableDraggableCard.tsx - Update to report position
React.useEffect(() => {
  cardRef.current?.measureInWindow((x, y, width, height) => {
    const cardId = `${card.rank}${card.suit}`;
    reportCardPosition(cardId, {
      id: cardId,
      x, y, width, height,
      type: 'card'
    });
  });
}, [card.rank, card.suit]);
```

#### **2. Simplified Drag Handler**

```jsx
// DraggableCard.tsx - Simplified drop handling
const handleDragEnd = (gestureState) => {
  const dropX = gestureState.moveX;
  const dropY = gestureState.moveY;

  // Find what was touched
  const touched = findTouchedCard(dropX, dropY);

  if (touched) {
    // Determine and send action
    const action = determineAction(draggedCard, touched.id, touched.type);
    sendAction(action);
  } else {
    // Trail to empty table
    sendAction({
      type: 'trail',
      payload: { card: draggedCard }
    });
  }
};
```

### **New Hook Structure**

#### **`useCardContact.ts`** - Main contact system hook
```typescript
export function useCardContact() {
  // Position tracking
  const reportPosition = useCallback((id: string, position: CardPosition) => {
    cardPositions.set(id, position);
  }, []);

  // Contact detection
  const findContact = useCallback((x: number, y: number) => {
    return findTouchedCard(x, y);
  }, []);

  // Action determination
  const determineAction = useCallback((
    draggedCard: Card,
    contactId: string,
    contactType: 'card' | 'build'
  ) => {
    return determineActionFromContact(draggedCard, contactId, contactType);
  }, []);

  return { reportPosition, findContact, determineAction };
}
```

#### **`useCardPositions.ts`** - Position tracking
```typescript
export function useCardPositions() {
  const positionsRef = useRef(new Map<string, CardPosition>());

  const reportPosition = useCallback((id: string, position: CardPosition) => {
    positionsRef.current.set(id, position);
  }, []);

  const getPositions = useCallback(() => {
    return positionsRef.current;
  }, []);

  return { reportPosition, getPositions };
}
```

## 📋 **MIGRATION PLAN**

### **Phase 1: Remove Old System (1-2 hours)**

#### **Files to Delete:**
- `hooks/useDropZoneResolver.ts`
- `hooks/useDropZoneRegistration.ts`
- `constants/dropZonePriorities.ts`

#### **Code to Remove:**
- All `(global as any).dropZones` usage
- All `measureInWindow()` bounds calculations for drop zones
- All priority-based drop zone logic
- Drop zone registration in components

### **Phase 2: Add Position Tracking (2-3 hours)**

#### **Create New Files:**
- `hooks/useCardContact.ts`
- `hooks/useCardPositions.ts`
- `utils/contactDetector.ts`
- `utils/actionDeterminer.ts`

#### **Update Components:**
- **BuildCardRenderer.tsx**: Add position reporting
- **TableDraggableCard.tsx**: Add position reporting
- **TempStackRenderer.tsx**: Add position reporting (optional)

### **Phase 3: Update Drag Handlers (2-3 hours)**

#### **Update Files:**
- **DraggableCard.tsx**: Replace drop zone logic with contact detection
- **useDragHandlers.ts**: Simplify drag end handling
- **GameBoard.tsx**: Remove drop zone registration

#### **New Drag Flow:**
```jsx
// Before (complex):
const handleDragEnd = (gestureState) => {
  const dropPosition = { x: gestureState.moveX, y: gestureState.moveY };
  const resolution = resolveDropZone(dropPosition);
  if (resolution.bestZone) {
    resolution.bestZone.onDrop(draggedItem);
  }
};

// After (simple):
const handleDragEnd = (gestureState) => {
  const touched = findTouchedCard(gestureState.moveX, gestureState.moveY);
  if (touched) {
    const action = determineAction(draggedCard, touched.id, touched.type);
    sendAction(action);
  } else {
    sendAction({ type: 'trail', payload: { card: draggedCard } });
  }
};
```

### **Phase 4: Visual Feedback (1-2 hours)**

#### **Add Contact Indicators:**
- Highlight valid targets during drag
- Show action preview on hover
- Visual confirmation on contact

#### **Update Components:**
- Add visual feedback to card components
- Show drag preview with action hints

### **Phase 5: Testing & Polish (2-3 hours)**

#### **Test Scenarios:**
- **Capture**: Drag matching value card to loose card
- **Build Creation**: Drag card to loose card for build
- **Build Augmentation**: Drag card to existing build
- **Trail**: Drag card to empty table area

#### **Debug Tools:**
- Position overlay for development
- Contact detection logging
- Action determination validation

## 🎯 **KEY BENEFITS**

### **Before (Drop Zones):**
❌ Complex global registry management
❌ Bounds measurement timing issues
❌ Priority conflicts and resolution
❌ ID mismatches between render and game state
❌ Invisible zone debugging difficulties
❌ Performance overhead of continuous measurements

### **After (Contact-Based):**
✅ Simple position tracking per component
✅ Reliable contact detection with distance calculation
✅ No priority conflicts - closest wins
✅ Direct game state ID usage
✅ Visual contact feedback
✅ Better performance with lazy position updates

## 🔧 **IMPLEMENTATION DETAILS**

### **Distance Threshold**
```typescript
const CONTACT_DISTANCE_THRESHOLD = 80; // pixels
// Cards within 80px of drop point are considered "touched"
```

### **Position Update Timing**
```typescript
// Update positions on:
- Component mount
- Layout changes (onLayout)
- Window resize/orientation change
// NOT on every render (performance)
```

### **Fallback for Trails**
```typescript
// If no card contact detected:
// 1. Check if drop is in table area (trail)
// 2. Send trail action
// 3. Snap back to hand
```

## 📁 **FINAL FILE STRUCTURE**

```
src/
├── contact-system/
│   ├── ContactDetector.ts          # Core contact detection
│   ├── PositionTracker.ts          # Position management
│   ├── ActionDeterminer.ts         # Action logic
│   ├── ContactOverlay.tsx          # Visual feedback
│   └── index.ts
├── components/
│   ├── DraggableCard.tsx           # Updated for contact
│   ├── TableCard.tsx               # Position reporting
│   ├── BuildRenderer.tsx           # Position reporting
│   └── ContactIndicator.tsx        # Visual feedback
├── hooks/
│   ├── useCardContact.ts           # Main contact hook
│   ├── useCardPositions.ts         # Position tracking
│   └── useContactFeedback.ts       # Visual feedback
└── utils/
    ├── contactDetection.ts         # Distance calculations
    └── actionDetermination.ts      # Game logic
```

## 🚀 **READY FOR IMPLEMENTATION**

This refactor will transform the complex, buggy drop zone system into a simple, reliable contact-based system that matches player expectations and eliminates the current issues with build augmentation and card interactions.

The new system will be:
- **More intuitive** for players
- **Easier to debug** and maintain
- **Better performing** with less overhead
- **More reliable** with no timing issues
