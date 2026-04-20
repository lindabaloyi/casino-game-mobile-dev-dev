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

import React, { useMemo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useWindowDimensions } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  card: Card;
  isMyTurn: boolean;
  playerNumber: number;
  /** Find a specific card at point (excludeId prevents self-match) */
  findCardAtPoint: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  /** Find a temp stack at point */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number } | null;
  /** Find a build stack at point */
  findBuildStackAtPoint: (x: number, y: number) => { stackId: string; owner: number } | null;
  
  // ── DUMB callbacks - just report what was hit ────────────────────────────
  /** Called when dropped on a build stack */
  onDropOnBuildStack?: (card: Card, stackId: string, owner: number, source: string) => void;
  /** Called when dropped on a temp stack */
  onDropOnTempStack?: (card: Card, stackId: string, source: string) => void;
  /** Called when dropped on a card - SmartRouter decides what action */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  /** Called when card is double-tapped - for createSingleTemp */
  onDoubleTap?: (card: Card) => void;
  
  // ── Legacy callbacks (for ghost overlay) ─────────────────────────────────
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  // ── Shared values for UI-thread ghost updates (OPTIMIZATION) ────────────────
  ghostX?: SharedValue<number>;
  ghostY?: SharedValue<number>;
  isGhostDragging?: SharedValue<boolean>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableTableCard({
  card,
  isMyTurn,
  playerNumber,
  findCardAtPoint,
  findTempStackAtPoint,
  findBuildStackAtPoint,
  onDropOnBuildStack,
  onDropOnTempStack,
  onDropOnCard,
  onDoubleTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  ghostX,
  ghostY,
  isGhostDragging,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive card dimensions - use shared constants for consistency
  const responsiveCardWidth = useMemo(() => {
    return Math.min(CARD_WIDTH, screenWidth / 5);
  }, [screenWidth]);
  
  const responsiveCardHeight = useMemo(() => {
    return responsiveCardWidth * (CARD_HEIGHT / CARD_WIDTH); // Maintain aspect ratio
  }, [responsiveCardWidth]);
  
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
    opacity.value = withTiming(1, { duration: 0 });
    if (onDragEnd) onDragEnd();
  }

  /**
   * Handle double-tap for createSingleTemp action
   */
  function handleDoubleTapCard() {
    if (onDoubleTap && isMyTurn) {
      onDoubleTap(card);
    }
  }

  /**
   * handleDrop — DUMB UI: just detects WHAT was hit
   * SmartRouter decides what action to take
   */
  function handleDrop(absX: number, absY: number) {
    // 1. Check if dropped on a build stack
    const buildStackHit = findBuildStackAtPoint(absX, absY);
    if (buildStackHit) {
      opacity.value = withTiming(0, { duration: 0 });
      if (onDragEnd) onDragEnd();
      
      // Call build stack handler
      if (onDropOnBuildStack) {
        onDropOnBuildStack(card, buildStackHit.stackId, buildStackHit.owner, 'table');
      }
      return;
    }

    // 2. Check if dropped on a temp stack
    const tempStackHit = findTempStackAtPoint(absX, absY);
    if (tempStackHit) {
      opacity.value = withTiming(0, { duration: 0 });
      if (onDragEnd) onDragEnd();
      
      // Call temp stack handler
      if (onDropOnTempStack) {
        onDropOnTempStack(card, tempStackHit.stackId, 'table');
      }
      return;
    }

    // 3. Check if dropped on another loose table card (exclude self)
    const cardHit = findCardAtPoint(absX, absY, cardId);
    if (cardHit) {
      opacity.value = withTiming(0, { duration: 0 });
      if (onDragEnd) onDragEnd();
      onDropOnCard(card, cardHit.card);
      return;
    }

    // 4. Miss — snap back
    handleSnapBack();
  }

  // ── Gesture ─────────────────────────────────────────────────────────────

  // Double-tap gesture (disabled - kept for gesture compatibility)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(isMyTurn)
    .onEnd(() => {
      runOnJS(handleDoubleTapCard)();
    });

  // OPTIMIZED: Pan gesture - minDistance(0) for instant response, direct shared value updates
  // Note: Using CARD constants for worklet - responsive values can't be accessed in worklet
  const panGesture = Gesture.Pan()
    .minDistance(0)  // Start dragging immediately
    .enabled(isMyTurn)
    .onStart(e => {
      'worklet';
      // Immediate hide - no animation delay
      opacity.value = 0;
      // Update ghost position directly on UI thread (zero latency)
      if (ghostX) ghostX.value = e.absoluteX - CARD_WIDTH / 2;
      if (ghostY) ghostY.value = e.absoluteY - CARD_HEIGHT / 2;
      if (isGhostDragging) isGhostDragging.value = true;
      
      // JS callback for game logic
      runOnJS(_onDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      'worklet';
      // Worklet update (fast path)
      if (ghostX) ghostX.value = e.absoluteX - CARD_WIDTH / 2;
      if (ghostY) ghostY.value = e.absoluteY - CARD_HEIGHT / 2;
      // JS bridge update (guaranteed to work)
      runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      'worklet';
      if (isGhostDragging) isGhostDragging.value = false;
      
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  // Use Exclusive gesture - try double-tap first, fall back to pan
  // This ensures double-tap can complete before pan takes over
  const gesture = Gesture.Exclusive(doubleTapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard 
          rank={card.rank} 
          suit={card.suit} 
          width={responsiveCardWidth}
          height={responsiveCardHeight}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableTableCard;
