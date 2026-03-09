/**
 * TempStackView
 * Renders a temp_stack (pending/active stack that needs acceptance).
 * 
 * Characteristics:
 * - Draggable by owner on their turn
 * - Shows type badge (TEMP)
 * - Shows build value with need indicator
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { TempStack } from './types';
import { TempStackBounds, CapturePileBounds } from '../../hooks/useDrag';
import { getStackConfig } from '../../constants/stackActions';
import { getBuildHint } from '../../utils/buildCalculator';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;
const CARD_H       = 84;
const STACK_OFFSET = 6;
const BADGE_H      = 22;
const STACK_PAD    = 4;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: TempStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion: number;
  registerTempStack: (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
  
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
  const canDrag = isMyTurn && playerNumber !== undefined && stack.owner === playerNumber;

  // Debug logging - check every render
  console.log(`[TempStackView] === RENDER CHECK === stackId: ${stack.stackId}`);
  console.log(`[TempStackView] stack.owner: ${stack.owner}, playerNumber: ${playerNumber}, isMyTurn: ${isMyTurn}`);
  console.log(`[TempStackView] canDrag calculation: ${isMyTurn} && ${playerNumber !== undefined} && ${stack.owner} === ${playerNumber} = ${canDrag}`);

  // bottom = highest-value card (base)
  // top    = most recently added card
  const bottom = stack.cards[0];
  const top    = stack.cards[stack.cards.length - 1];

  // Compute build hint dynamically from card values
  const hint = useMemo(() => {
    if (!stack.cards || stack.cards.length < 2) return null;
    const values = stack.cards.map(c => c.value);
    return getBuildHint(values);
  }, [stack.cards]);

  // Determine display value and badge color
  // Priority: computed hint > server-provided values
  let displayValue: string;
  let badgeColor: string;
  
  if (hint) {
    if (hint.need === 0) {
      // Complete stack - show target value with purple badge
      displayValue = hint.value.toString();
      badgeColor = '#9C27B0'; // Purple for complete
    } else {
      // Incomplete stack - show needed value with red badge
      displayValue = `-${hint.need}`;
      badgeColor = '#E53935'; // Red for incomplete
    }
  } else {
    // Fallback to server-provided values
    displayValue = stack.need > 0 ? `-${stack.need}` : stack.value?.toString() ?? '-';
    badgeColor = stack.need > 0 ? '#E53935' : '#9C27B0';
  }

  // ── Position registration ─────────────────────────────────────────────────
  const onLayout = useCallback(() => {
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

  // Re-measure on table reflow
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

  // ── Resolve badge config ─────────────────────────────────────────────────
  const config = getStackConfig(stack.type);
  const badgeLabel = config?.label ?? 'TEMP';

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragStartInternal = useCallback(() => {
    if (onDragStart) {
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

    console.log(`[TempStackView] Drag end - absX: ${absX}, absY: ${absY}, playerNumber: ${playerNumber}, canDrag: ${canDrag}`);

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      console.log(`[TempStackView] findCapturePileAtPoint result:`, pile);
      
      if (pile && pile.playerIndex === playerNumber) {
        console.log('[TempStackView] Dropped on own capture pile:', pile);
        if (onDropToCapture) {
          console.log('[TempStackView] Calling onDropToCapture with stack:', stack.stackId);
          onDropToCapture(stack, 'hand');
        }
        return;
      }
    }
    
    console.log('[TempStackView] Not dropped on capture pile - calling onDragEnd');
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, stack, playerNumber, translateX, translateY, isDragging, canDrag]);

  const panGesture = Gesture.Pan()
    .enabled(!!canDrag)
    .onStart(() => {
      console.log('[TempStackView] ===== GESTURE START =====');
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
      console.log('[TempStackView] ===== GESTURE END =====');
      runOnJS(handleDragEndInternal)(event.absoluteX, event.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  // Handle the case where stack might have only 1 card (shouldn't normally happen but could during edge cases)
  // Don't return null - render what's available
  const hasBottom = bottom && stack.cards.length >= 1;
  const hasTop = top && stack.cards.length >= 2;
  
  // If we don't have at least a bottom card, return null (shouldn't normally happen)
  if (!hasBottom) {
    console.log(`[TempStackView] No bottom card in stack ${stack.stackId}, cards length: ${stack.cards.length}`);
    return null;
  }

  console.log(`[TempStackView] Rendering with canDrag=${canDrag}, hasBottom=${hasBottom}, hasTop=${hasTop}`);

  console.log(`[TempStackView] Rendering with canDrag=${canDrag}, gesture enabled=${!!canDrag}`);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View ref={viewRef} style={[styles.container, animatedStyle]} onLayout={onLayout}>
        {/* Base card — highest value */}
        <View style={styles.cardBottom}>
          <PlayingCard rank={bottom.rank} suit={bottom.suit} />
        </View>

        {/* Top card — most recently added */}
        <View style={styles.cardTop}>
          <PlayingCard rank={top.rank} suit={top.suit} />
        </View>

        {/* Build value badge */}
        <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.valueText}>{displayValue}</Text>
        </View>

        {/* Type badge */}
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: config?.badgeColor ?? '#17a2b8' }]}>
            {badgeLabel}
          </Text>
        </View>
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
    zIndex: 20,
    elevation: 5,
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
});

export default TempStackView;
