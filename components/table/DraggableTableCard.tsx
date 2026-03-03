/**
 * DraggableTableCard
 * A loose table card the current player can drag.
 * 
 * UI is DUMB - just detects WHAT was hit, SmartRouter decides WHAT IT MEANS.
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
import { Card } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  card: Card;
  isMyTurn: boolean;
  playerNumber: number;
  /** Find a specific card at point (excludeId prevents self-match) */
  findCardAtPoint: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  /** Find a stack at point */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack'; value?: number } | null;
  
  // ── DUMB callbacks - just report what was hit ────────────────────────────
  /** Called when dropped on a stack - SmartRouter decides what action */
  onDropOnStack: (card: Card, stackId: string, owner: number, stackType: 'temp_stack' | 'build_stack') => void;
  /** Called when dropped on a card - SmartRouter decides what action */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  
  // ── Legacy callbacks (for ghost overlay) ─────────────────────────────────
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableTableCard({
  card,
  isMyTurn,
  playerNumber,
  findCardAtPoint,
  findTempStackAtPoint,
  onDropOnStack,
  onDropOnCard,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const opacity = useSharedValue(1);
  const cardId = `${card.rank}${card.suit}`;

  // ── JS-thread handlers ────────────────────────────────────────────────────

  function _onDragStart(x: number, y: number) { 
    if (onDragStart) onDragStart(card, x, y); 
  }
  
  function _onDragMove(x: number, y: number) { 
    if (onDragMove) onDragMove(x, y); 
  }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    if (onDragEnd) onDragEnd();
  }

  /**
   * handleDrop — DUMB UI: just detects WHAT was hit
   * SmartRouter decides what action to take
   */
  function handleDrop(absX: number, absY: number) {
    // 1. Check if dropped on a stack
    const stackHit = findTempStackAtPoint(absX, absY);
    if (stackHit) {
      console.log(`[DraggableTableCard] DROP ON STACK — ${cardId} → stack ${stackHit.stackId} (${stackHit.stackType}) owned by P${stackHit.owner}`);
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnStack(card, stackHit.stackId, stackHit.owner, stackHit.stackType);
      return;
    }

    // 2. Check if dropped on another loose table card (exclude self)
    const cardHit = findCardAtPoint(absX, absY, cardId);
    if (cardHit) {
      console.log(`[DraggableTableCard] DROP ON CARD — ${cardId} → ${cardHit.card.rank}${cardHit.card.suit}`);
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnCard(card, cardHit.card);
      return;
    }

    // 3. Miss — snap back
    console.log(`[DraggableTableCard] MISS — ${cardId} snapping back`);
    handleSnapBack();
  }

  // ── Gesture ─────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      runOnJS(_onDragStart)(e.absoluteX, e.absoluteY);
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
