/**
 * DraggableTableCard
 * A loose table card the current player can drag to:
 *   → Another loose table card  → createTempFromTable action
 *   → Their own temp stack      → addToTemp action
 *   → Miss                      → no server call, opacity restored
 *
 * Threading note: same pattern as DraggableHandCard — only raw coordinates
 * are passed from the UI worklet into JS-thread handlers so that refs are
 * always read fresh.
 */

import React from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  card: Card;
  isMyTurn: boolean;
  playerNumber: number;
  /**
   * excludeId = `${rank}${suit}` of the dragged card — prevents self-match
   * in the card position registry.
   */
  findCardAtPoint: (x: number, y: number, excludeId?: string) => Card | null;
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number } | null;
  /** Dragged loose card dropped on another loose card → createTempFromTable */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  /** Dragged loose card dropped on own temp stack → addToTemp */
  onDropOnTemp: (card: Card, stackId: string) => void;
  /** Ghost overlay callbacks */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableTableCard({
  card,
  isMyTurn,
  playerNumber,
  findCardAtPoint,
  findTempStackAtPoint,
  onDropOnCard,
  onDropOnTemp,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const opacity = useSharedValue(1);
  const cardId  = `${card.rank}${card.suit}`;

  // ── JS-thread handlers ────────────────────────────────────────────────────

  function _onDragStart()   { onDragStart(card); }
  function _onDragMove(x: number, y: number) { onDragMove(x, y); }

  function handleDrop(absX: number, absY: number) {
    // 1. Check if dropped on an own temp stack
    const tempHit = findTempStackAtPoint(absX, absY);
    if (tempHit && tempHit.owner === playerNumber) {
      console.log(`[DraggableTableCard] DROP ON TEMP — ${cardId} → stack ${tempHit.stackId}`);
      onDragEnd();
      onDropOnTemp(card, tempHit.stackId);
      return;
    }

    // 2. Check if dropped on another loose table card (exclude self)
    const cardHit = findCardAtPoint(absX, absY, cardId);
    if (cardHit) {
      console.log(
        `[DraggableTableCard] DROP ON CARD — ${cardId} → ${cardHit.rank}${cardHit.suit}`,
      );
      onDragEnd();
      onDropOnCard(card, cardHit);
      return;
    }

    // 3. Miss — card stays on table, just restore opacity
    console.log(`[DraggableTableCard] MISS — ${cardId} snapping back`);
    opacity.value = withSpring(1);
    onDragEnd();
  }

  // ── Gesture ───────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      runOnJS(_onDragStart)();
      runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableTableCard;
