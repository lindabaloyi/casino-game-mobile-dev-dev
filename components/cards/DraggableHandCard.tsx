/**
 * DraggableHandCard
 * A hand card the player can drag to the table to trail.
 *
 * During drag the card hides itself (opacity → 0) and delegates visual
 * rendering to the parent's drag overlay, which renders outside the
 * ScrollView and is therefore never clipped by it.
 *
 * Props:
 *   card        — the card data { rank, suit, value }
 *   dropBounds  — ref to absolute table bounds (from useDrag)
 *   isMyTurn    — gesture is disabled when it's not this player's turn
 *   onTrail     — called when the card is successfully dropped on the table
 *   onDragStart — called (with the card) when a drag begins
 *   onDragMove  — called every frame with absolute screen coords of the finger
 *   onDragEnd   — called when the drag finishes (drop or snap-back)
 */

import React, { MutableRefObject } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from './PlayingCard';
import { DropBounds } from '../../hooks/useDrag';

// ── Types ────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  card: Card;
  dropBounds: MutableRefObject<DropBounds>;
  isMyTurn: boolean;
  onTrail: (card: Card) => void;
  /** Overlay callbacks — called via runOnJS so the parent can render the ghost card */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableHandCard({
  card,
  dropBounds,
  isMyTurn,
  onTrail,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const opacity = useSharedValue(1);

  // JS-thread callbacks
  function handleTrail()      { onTrail(card); }
  function handleDragStart()  { onDragStart(card); }
  function handleDragMove(x: number, y: number) { onDragMove(x, y); }
  function handleDragEnd()    { onDragEnd(); }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    onDragEnd();
  }

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      // Hide the real card; the overlay in GameBoard renders the ghost
      opacity.value = 0;
      runOnJS(handleDragStart)();
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      const b = dropBounds.current;
      const inZone =
        e.absoluteX >= b.x &&
        e.absoluteX <= b.x + b.width &&
        e.absoluteY >= b.y &&
        e.absoluteY <= b.y + b.height;

      if (inZone) {
        // Card is consumed — stays hidden, server removes it from hand
        runOnJS(handleDragEnd)();
        runOnJS(handleTrail)();
      } else {
        // Snap the real card back into view
        runOnJS(handleSnapBack)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableHandCard;
