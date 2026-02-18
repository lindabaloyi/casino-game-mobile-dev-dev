/**
 * DraggableHandCard
 * A hand card the player can drag to the table.
 *
 * Drop detection (JS-thread — never inside a worklet):
 *  1. If the finger lands on a SPECIFIC table card → onCardDrop(handCard, targetCard)
 *     → GameBoard sends createTemp action
 *  2. If the finger lands anywhere on the table → onTrail(handCard)
 *     → GameBoard sends trail action
 *  3. Otherwise → snap back
 *
 * Threading note:
 *   On native, RNGH callbacks run as UI-thread worklets. Reanimated serialises
 *   captured JS objects at worklet-creation time, so dropBounds / cardPositions
 *   refs captured inside the worklet are stale. The fix: pass only raw
 *   coordinates from the worklet, then read refs inside runOnJS handlers on the
 *   JS thread where refs are always fresh.
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  card: Card;
  dropBounds: MutableRefObject<DropBounds>;
  /** Finds a specific table card at (x, y); returns null if no card there */
  findCardAtPoint: (x: number, y: number) => Card | null;
  isMyTurn: boolean;
  onTrail: (card: Card) => void;
  /** Called when the dragged card lands on a specific table card */
  onCardDrop: (handCard: Card, targetCard: Card) => void;
  /** Overlay callbacks */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableHandCard({
  card,
  dropBounds,
  findCardAtPoint,
  isMyTurn,
  onTrail,
  onCardDrop,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const opacity = useSharedValue(1);

  // ── JS-thread helpers ─────────────────────────────────────────────────────

  function handleDragStart() { onDragStart(card); }
  function handleDragMove(x: number, y: number) { onDragMove(x, y); }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    onDragEnd();
  }

  /**
   * handleDrop — runs on the JS thread.
   *
   * Priority:
   *   1. Specific table card hit → createTemp
   *   2. General table area hit  → trail
   *   3. Miss → snap back
   */
  function handleDrop(absX: number, absY: number) {
    // 1. Check for a specific table card under the finger
    const targetCard = findCardAtPoint(absX, absY);
    if (targetCard) {
      console.log(
        `[DraggableHandCard] CARD DROP — ${card.rank}${card.suit} → ${targetCard.rank}${targetCard.suit}`,
      );
      onDragEnd();
      onCardDrop(card, targetCard);
      return;
    }

    // 2. General table drop → trail
    const b = dropBounds.current;
    const inZone =
      absX >= b.x &&
      absX <= b.x + b.width &&
      absY >= b.y &&
      absY <= b.y + b.height;

    console.log(
      `[DraggableHandCard] DROP — card: ${card.rank}${card.suit}`,
      `| finger: (${absX.toFixed(1)}, ${absY.toFixed(1)})`,
      `| bounds: x=${b.x.toFixed(1)} y=${b.y.toFixed(1)} w=${b.width.toFixed(1)} h=${b.height.toFixed(1)}`,
      `| inZone: ${inZone}`,
    );

    if (inZone) {
      onDragEnd();
      onTrail(card);
    } else {
      handleSnapBack();
    }
  }

  function logDragStart(absX: number, absY: number) {
    console.log(
      `[DraggableHandCard] DRAG START — card: ${card.rank}${card.suit}`,
      `| finger: (${absX.toFixed(1)}, ${absY.toFixed(1)})`,
      `| isMyTurn: ${isMyTurn}`,
    );
  }

  // ── Gesture ───────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      runOnJS(handleDragStart)();
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
      runOnJS(logDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      // Pass ONLY coordinates to JS thread — refs are read there (always fresh)
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
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
