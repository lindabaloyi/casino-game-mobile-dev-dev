# Card Dealing Animation Plan

## Overview
Add a playful card dealing animation effect when cards are dealt to players at the start of each round. Cards should appear to fly or slide from a central "deck" position to each player's hand area simultaneously.

## Current State Analysis

### Where Cards Are Dealt
- **Initialization**: [`shared/game/initialization.js`](shared/game/initialization.js) - `initializeGame()` function deals cards at round start
- **Round transitions**: [`shared/game/round.js`](shared/game/round.js) - `startNextRound()` deals new hands

### Where Cards Are Rendered
- **Player Hand**: [`components/game/PlayerHandArea.tsx`](components/game/PlayerHandArea.tsx) - renders cards in a fanned row
- **Individual Card**: [`components/cards/DraggableHandCard.tsx`](components/cards/DraggableHandCard.tsx)

### Available Animation Library
- **react-native-reanimated** v4.1.1 is already installed

---

## Implementation Plan

### 1. Create Animation State Tracking

Create a new hook to track dealing animation state:

```typescript
// hooks/useDealingAnimation.ts
interface DealingState {
  isDealing: boolean;
  dealingCards: Map<string, DealingCard>; // cardId -> animation state
}

interface DealingCard {
  cardId: string;
  targetPlayer: number;
  delay: number; // stagger delay for this card
}
```

**Logic**:
- Detect when `hand.length` increases (new cards dealt)
- Compare previous hand vs new hand to identify new cards
- Trigger animation for new cards only

### 2. Create Animated Card Component

Create a wrapper component that handles the dealing animation:

```typescript
// components/cards/AnimatedCard.tsx
interface Props {
  card: Card;
  children: React.ReactNode; // the actual card component
  isBeingDealt: boolean;
  delay: number;
  onAnimationComplete?: () => void;
}
```

**Animation**:
- Start position: Center of screen (deck position)
- End position: Final position in hand (calculated)
- Use `withSpring` or `withTiming` for natural card motion
- Add slight rotation during flight for realism
- Duration: ~300-400ms per card
- Stagger: ~50-100ms between cards

### 3. Modify PlayerHandArea to Use Animated Cards

Update [`PlayerHandArea.tsx`](components/game/PlayerHandArea.tsx):

1. Import the new animated card wrapper
2. Track hand changes to detect new cards
3. Wrap each `DraggableHandCard` in the animation component
4. Keep existing styling unchanged

### 4. Calculate Deck Position

**Deck position**: Center of the table area
- Can use screen dimensions: `width / 2, height / 2`
- Or reference the table area bounds

### 5. Stagger Strategy

For realistic dealing effect:
- **Simultaneous dealing**: All players get cards "at the same time" visually
- **Per-card stagger**: Cards for each player are staggered (~50-100ms apart)
- **Total animation time**: ~500ms per card × number of cards dealt

Example for 10 cards:
```
Card 1: delay 0ms
Card 2: delay 50ms
Card 3: delay 100ms
...
Card 10: delay 450ms
Total: ~750ms for all cards
```

---

## Technical Details

### Animation Properties (Balatro-Inspired)

| Property | Value | Notes |
|----------|-------|-------|
| Duration | 200-300ms | Per card |
| Easing | Spring | withSpring({ damping: 12, stiffness: 100 }) |
| Rotation | 15-30° | Slight tilt during flight, end straight |
| Scale | 0.8 → 1.0 | Scale down during flight, snap to size |
| Stagger | 50-100ms | Between cards for cascading effect |

### State Management

The animation should be **purely visual**:
- No changes to game state
- No changes to card data structure
- Animation completes before card is "playable"
- Cards remain interactive after animation

### Files to Modify

| File | Change |
|------|--------|
| `hooks/useDealingAnimation.ts` | **NEW** - Animation state tracking |
| `components/cards/AnimatedCard.tsx` | **NEW** - Animated wrapper component |
| `components/game/PlayerHandArea.tsx` | Integrate animation wrapper |
| `constants/cardDimensions.ts` | (Optional) Add animation constants |

### Files to Create

| File | Purpose |
|------|---------|
| `hooks/useDealingAnimation.ts` | Track dealing state |
| `components/cards/AnimatedCard.tsx` | Reanimated animation wrapper |

---

## Alternative Approaches

### Option A: Per-Card Animation (Recommended)
- Each card animates independently
- Staggered delays for dealing effect
- Pros: Most realistic, smooth
- Cons: More complex state tracking

### Option B: Wave Animation
- Cards dealt in waves (e.g., 2 cards at a time)
- Pros: Easier to implement
- Cons: Less realistic

### Option C: Simple Fade + Slide
- Cards fade in while sliding to position
- Pros: Simple, performant
- Cons: Less "dealing" feel

---

## Questions for Clarification

1. **Animation style preference**:
   - Fly/fly with rotation (most realistic)
   - Simple slide in
   - Fade + slide

2. **Dealing speed**:
   - Fast (~200ms per card)
   - Medium (~300ms per card) 
   - Slow (~400ms per card)

3. **Should opponent cards also animate**? Yes, all players should see cards being dealt to them.

4. **Should this also apply to round transitions** (startNextRound)? Yes, any time cards are dealt.

---

## Summary

This plan uses **react-native-reanimated** which is already installed to create a smooth, realistic card dealing animation. The implementation:

1. Detects when new cards are dealt (hand size change)
2. Wraps new cards in an animated component
3. Animates from deck (center screen) to hand position
4. Uses staggered timing for realistic dealing effect
5. Keeps all existing styling and game logic unchanged
