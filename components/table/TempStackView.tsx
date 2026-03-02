/**
 * TempStackView
 * Renders a temp_stack or build_stack as a fanned pair of cards.
 * 
 * - temp_stack: shows build value with preview
 * - build_stack: shows owner indicator (P1 or P2)
 * - Can be dragged to capture pile (temp_stack only, owner's turn)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { TempStack, BuildStack, Card } from './types';
import { TempStackBounds, CapturePileBounds } from '../../hooks/useDrag';
import { getStackConfig } from '../../constants/stackActions';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;   // matches PlayingCard width
const CARD_H       = 84;   // matches PlayingCard height
const STACK_OFFSET = 6;    // how much the top card is shifted right/down
const BADGE_H      = 22;   // height reserved for the badge below the cards
const STACK_PAD    = 4;    // extra breathing room on the right

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: TempStack | BuildStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion:       number;
  registerTempStack:   (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
  /** Capture callback - for when a hand card is dropped on this stack */
  onCapture?: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;
  
  // Drag callbacks (for dragging temp stack to capture pile)
  isMyTurn?: boolean;
  playerNumber?: number;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: TempStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TempStackView({ 
  stack, 
  layoutVersion, 
  registerTempStack, 
  unregisterTempStack, 
  onCapture,
  isMyTurn,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
}: Props) {
  const viewRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Only temp_stack can be dragged, and only by the owner on their turn
  const canDrag = isMyTurn && playerNumber !== undefined && stack.owner === playerNumber && stack.type === 'temp_stack';

  // bottom = highest-value card (set at creation)
  // top    = most recently added card
  const bottom = stack.cards[0];
  const top    = stack.cards[stack.cards.length - 1];

  // Use server-provided values (value and need)
  // Server calculates: sum builds (total≤10) or diff builds (total>10)
  // Only temp_stack has need, build_stack doesn't
  const need = 'need' in stack ? stack.need : 0;
  const displayValue = need > 0 ? `-${need}` : stack.value?.toString() ?? '-';
  const badgeColor = need > 0 ? '#E53935' : '#9C27B0'; // Red for incomplete, Purple for complete

  // ── Position registration ─────────────────────────────────────────────────
  const onLayout = useCallback(() => {
    // RAF ensures the native frame is fully painted before measuring.
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
          stackType: stack.type,
        });
      });
    });
  }, [stack.stackId, stack.owner, stack.type, registerTempStack]);

  // Re-measure on table reflow (sibling card changes shift this stack's position).
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
          stackType: stack.type,
        });
      });
    });
  }, [layoutVersion, stack.stackId, stack.owner, stack.type, registerTempStack]);

  useEffect(() => {
    return () => unregisterTempStack(stack.stackId);
  }, [stack.stackId, unregisterTempStack]);

  // ── Resolve badge config from design tokens ───────────────────────────────
  const config = getStackConfig(stack.type);
  const badgeLabel = config?.label ?? stack.type.toUpperCase();

  // Card count for badge (not displayed, just placeholder)
  const cardCount = 0;
  const isBuild = stack.type === 'build_stack';
  const ownerLabel = `P${stack.owner + 1}`;

  // Drag handlers - must be before early return per React Hooks rules
  const handleDragStartInternal = useCallback(() => {
    if (onDragStart && stack.type === 'temp_stack') {
      onDragStart(stack);
    }
  }, [onDragStart, stack]);

  const handleDragMoveInternal = useCallback((x: number, y: number) => {
    if (onDragMove) {
      onDragMove(x, y);
    }
  }, [onDragMove]);

  const handleDragEndInternal = useCallback((absX: number, absY: number) => {
    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;

    if (stack.type !== 'temp_stack') return;

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      if (pile && pile.playerIndex === playerNumber) {
        // Dropped on own capture pile - use onDropToCapture
        console.log('[TempStackView] Dropped on own capture pile:', pile);
        if (onDropToCapture) {
          onDropToCapture(stack, 'hand');
        }
        return;
      }
    }

    // Otherwise, call normal onDragEnd
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, stack, playerNumber, translateX, translateY, isDragging]);

  const panGesture = Gesture.Pan()
    .enabled(!!canDrag)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(handleDragStartInternal)();
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        runOnJS(handleDragMoveInternal)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      // Use the finger's absolute position for hit detection
      runOnJS(handleDragEndInternal)(event.absoluteX, event.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  if (!bottom || !top) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View ref={viewRef} style={[styles.container, animatedStyle]} onLayout={onLayout}>
      {/* Base card — highest value */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* Build indicator - shows build value with color */}
      <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* Badge — show with black text, left side */}
      {cardCount > 0 && (
        <View style={styles.cardCountBadge}>
          <Text style={styles.cardCountText}>+{cardCount}</Text>
      </View>
      )}

      {/* Badge — show for temp_stack type only */}
      {stack.type === 'temp_stack' && (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: config?.badgeColor ?? '#17a2b8' }]}>
            {badgeLabel}
          </Text>
        </View>
      )}

      {/* Owner indicator — show for build_stack type only */}
      {isBuild && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerText}>{ownerLabel}</Text>
        </View>
      )}
    </Animated.View>
    </GestureDetector>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width:    CARD_W + STACK_OFFSET + STACK_PAD,
    height:   CARD_H + STACK_OFFSET + BADGE_H,
    position: 'relative',
  },
  cardBottom: {
    position: 'absolute',
    top:  0,
    left: 0,
  },
  cardTop: {
    position:     'absolute',
    top:          STACK_OFFSET,
    left:         STACK_OFFSET,
    shadowColor:  '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius:  3,
    elevation:    4,
  },
  // Value badge - shows build value (top-right corner)
  valueBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 20,        // Make sure it appears above cards
    elevation: 5,      // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  // Card count badge - white circle with black text (left side)
  cardCountBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    zIndex: 21,
  },
  cardCountText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Owner badge for build stacks (P1 or P2 indicator)
  ownerBadge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  ownerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f59e0b', // amber
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default TempStackView;
