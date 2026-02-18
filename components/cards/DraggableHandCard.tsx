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
 *
 * ── Web vs Native threading note ─────────────────────────────────────────────
 * On WEB:    RNGH callbacks run on the JS thread — React refs are always live.
 * On NATIVE: RNGH + Reanimated runs callbacks as UI-thread worklets. Reanimated
 *            serialises captured JS objects at worklet-creation time, so
 *            `dropBounds.current` inside a worklet would be a stale initial copy
 *            ({ x:0, y:0, width:0, height:0 }) even after measureInWindow() has
 *            updated it.  The fix: pass only the raw gesture coordinates from
 *            the worklet, then read dropBounds.current inside a runOnJS handler
 *            that runs on the JS thread where the ref is always fresh.
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

  // ── JS-thread helpers ─────────────────────────────────────────────────────
  // All functions below run on the JS thread (called via runOnJS from worklets).

  function handleDragStart() {
    onDragStart(card);
  }

  function handleDragMove(x: number, y: number) {
    onDragMove(x, y);
  }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    onDragEnd();
  }

  /**
   * handleDrop — JS-thread drop decision.
   *
   * Reads dropBounds.current HERE on the JS thread so we always get the
   * value written by measureInWindow(), not the stale copy captured by the
   * worklet at render time.
   */
  function handleDrop(absX: number, absY: number) {
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
      // Card consumed — server will remove it from the hand
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
      // Hide the real card; GameBoard's overlay renders the ghost
      opacity.value = 0;
      runOnJS(handleDragStart)();
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
      runOnJS(logDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      // Pass ONLY the raw coordinates to the JS thread.
      // dropBounds.current is read inside handleDrop (JS thread) — never stale.
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
