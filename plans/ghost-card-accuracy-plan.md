# Ghost Card Accuracy Improvement Plan

## Problem

The real-time shared drag works, but the opponent's ghost card position is not perfectly aligned with the actual target card due to:
1. Different screen sizes and resolutions
2. Responsive flex-wrap layouts
3. Table bounds measured at different times
4. Normalized coordinates mapping incorrectly

## Root Causes

1. **Normalized coordinates** are relative to table bounding box, but card positions vary due to flex-wrap
2. **Table bounds** may be measured incorrectly or at different times
3. **Drop target** is determined by dragger's hit detection, but opponent only sees ghost moving without knowing actual target

## Recommended Approach: Hybrid

### During Drag Move
- Continue using normalized coordinates for smooth motion
- Ensure table bounds are measured accurately and updated on layout changes

### On Drag End (Key Improvement)
- **Broadcast target ID** (card/stack ID) in dragEnd event
- On opponent's client, use local hit detection to find the target's position
- Animate ghost to the actual target position (not just normalized coordinates)

---

## Implementation Plan

### Step 1: Modify dragEnd Payload

Update the event to include target info:

```typescript
// In useGameState.ts - emitDragEnd
emitDragEnd(card, position, outcome, targetType, targetId);

// In GameCoordinatorService.js - handleDragEnd
// Already has targetType and targetId in current implementation
```

### Step 2: Update OpponentDragState

Add target info to state:

```typescript
interface OpponentDragState {
  playerIndex: number;
  card: Card;
  source: 'hand' | 'table' | 'captured';
  position: { x: number; y: number };
  isDragging: boolean;
  // NEW: target info for accurate final position
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
}
```

### Step 3: Enhance OpponentGhostCard

The ghost card component needs to:
1. Accept target info
2. If target exists, use local registry to find exact position
3. Animate to final position before fading out

```typescript
interface OpponentGhostCardProps {
  card: Card;
  position: { x: number; y: number };
  tableBounds: TableBounds;
  // NEW
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
  // Functions to find local positions
  findCardPosition?: (id: string) => { x: number, y: number } | null;
  findStackPosition?: (id: string) => { x: number, y: number } | null;
}
```

### Step 4: Update GameBoard

Pass the target info and position finder functions:

```typescript
<OpponentGhostCard
  card={opponentDrag.card}
  position={opponentDrag.position}
  tableBounds={tableBounds}
  targetType={opponentDrag.targetType}
  targetId={opponentDrag.targetId}
  findCardPosition={(id) => getCardPosition(id)}  // from useDrag registry
  findStackPosition={(id) => getStackPosition(id)}
/>
```

### Step 5: Ensure Accurate Table Bounds

- Store table bounds in a ref that updates on every layout
- Pass fresh bounds to ghost card rendering
- Use `onTableLayout` callback to update bounds

---

## Files to Modify

1. **`hooks/useGameState.ts`**
   - Add targetType/targetId to opponentDrag state
   - Update socket listeners to capture target info

2. **`components/core/GameBoard.tsx`**
   - Pass target info to OpponentGhostCard
   - Pass position finder functions
   - Ensure table bounds are fresh

3. **`components/core/OpponentGhostCard.tsx`**
   - Accept target info props
   - Use local registry to find target position on drag end
   - Animate to final position

4. **`shared/drag-events.ts`** (optional - for type definitions)
   - Update DragEndEvent interface

---

## Animation Flow

1. **Drag starts** → Ghost appears at normalized start position
2. **During drag** → Ghost moves with normalized coordinates (smooth)
3. **Drag ends**:
   - If **hit target**: Ghost animates to actual target card/stack position (using local registry), then fades
   - If **miss**: Ghost fades at final normalized position
4. **After fade** → State update arrives, showing final result

---

## Acceptance Criteria

- [ ] Ghost card appears on opponent's screen when player drags
- [ ] Ghost moves smoothly during drag (normalized coordinates)
- [ ] Ghost ends at ACTUAL target position (not just normalized)
- [ ] Works across different screen sizes
- [ ] No visual disconnect between ghost and actual drop result
