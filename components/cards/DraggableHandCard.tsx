/**
 * DraggableHandCard
 * A hand card the player can drag to the table to trail.
 *
 * Props:
 *   card        — the card data { rank, suit, value }
 *   dropBounds  — ref to absolute table bounds (from useDrag)
 *   isMyTurn    — gesture is disabled when it's not this player's turn
 *   onTrail     — called when the card is successfully dropped on the table
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableHandCard({ card, dropBounds, isMyTurn, onTrail }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale      = useSharedValue(1);
  const opacity    = useSharedValue(1);

  // JS-thread callbacks (called via runOnJS from gesture worklet)
  function handleTrail()  { onTrail(card); }
  function handleSnapBack() {
    translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    scale.value      = withSpring(1);
    opacity.value    = withSpring(1);
  }

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(() => {
      scale.value   = withSpring(1.15, { damping: 12 });
      opacity.value = withSpring(0.88);
    })
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const b    = dropBounds.current;
      const inZone =
        e.absoluteX >= b.x &&
        e.absoluteX <= b.x + b.width &&
        e.absoluteY >= b.y &&
        e.absoluteY <= b.y + b.height;

      if (inZone) {
        opacity.value = 0;           // hide immediately; server will remove from hand
        runOnJS(handleTrail)();
      } else {
        runOnJS(handleSnapBack)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: scale.value > 1.05 ? 999 : 1,
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
