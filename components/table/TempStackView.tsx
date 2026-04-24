/**
 * TempStackView
 * Renders a temp_stack (pending/active stack that needs acceptance).
 * 
 * Characteristics:
 * - Draggable by owner on their turn
 * - Shows type badge (TEMP)
 * - Shows build value with need indicator
 * 
 * Refactored to use separate hooks and components for better maintainability.
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { TempStack } from './types';
import { TempStackBounds, CapturePileBounds } from '../../hooks/useDrag';
import { getStackConfig } from '../../constants/stackActions';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';
import { useStackRegistration } from '../../hooks/table/useStackRegistration';
import { useTempStackCards } from '../../hooks/table/useTempStackCards';
import { useTempStackDisplay } from '../../hooks/table/useTempStackDisplay';
import { BuildValueBadge } from './components/BuildValueBadge';
import { TypeBadge } from './components/TypeBadge';
import { OpponentDragState } from '../../hooks/multiplayer/useOpponentDrag';

// Double-click threshold in milliseconds
const DOUBLE_CLICK_THRESHOLD = 300;

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = CARD_WIDTH;  // 56 - shared constant
const CARD_H       = CARD_HEIGHT; // 84 - shared constant
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
  
  // Player count for color determination (2, 3, or 4 players)
  playerCount?: number;
  
  // Party mode flag for team colors
  isPartyMode?: boolean;
  
  // Drag callbacks (for dragging temp stack to capture pile)
  isMyTurn?: boolean;
  playerNumber?: number;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: TempStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
  /** Called when the stack is tapped (to set build value for dual builds) */
  onBuildTap?: (stack: TempStack) => void;
  /** Opponent's drag state - for hiding stack when opponent drags it */
  opponentDrag?: OpponentDragState | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TempStackView({ 
  stack, 
  layoutVersion, 
  registerTempStack, 
  unregisterTempStack, 
  playerCount,
  isPartyMode = false,
  isMyTurn,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
  onBuildTap,
  opponentDrag,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  
  // Track last tap time for double-click detection
  const lastTapRef = useRef<number>(0);

  // Only temp_stack can be dragged, and only by the owner on their turn
  const canDrag = isMyTurn && playerNumber !== undefined && stack.owner === playerNumber;

  // ── 1. Registration hook ───────────────────────────────────────────────────
  const viewRef = useStackRegistration({
    stackId: stack.stackId,
    owner: stack.owner,
    stackType: stack.type,
    layoutVersion,
    register: registerTempStack,
    unregister: unregisterTempStack,
  });

  // ── 2. Cards derivation hook ─────────────────────────────────────────────
  const { bottom, top, pendingCards, isExtending } = useTempStackCards(stack);

  // ── 3. Display value & badge color hook ─────────────────────────────────
  const { displayValue, badgeColor } = useTempStackDisplay(stack, pendingCards, isExtending, playerCount, isPartyMode);

  // ── 4. Resolve badge config ─────────────────────────────────────────────
  const config = getStackConfig(stack.type);
  const badgeLabel = config?.label ?? 'TEMP';

  // ── 5. Drag handlers ─────────────────────────────────────────────────────
  const handleDragStartInternal = useCallback(() => {
    console.log('[TempStackView] handleDragStartInternal:', stack.stackId);
    console.log('[TempStackView] onDragStart defined:', !!onDragStart);
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

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      
      if (pile && pile.playerIndex === playerNumber) {
        if (onDropToCapture) {
          onDropToCapture(stack, 'hand');
        }
        return;
      }
    }
    
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, stack, playerNumber, translateX, translateY, isDragging]);

  const panGesture = Gesture.Pan()
    .enabled(!!canDrag)
    .onStart(() => {
      console.log('[TempStackView] Pan gesture started:', stack.stackId);
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
      runOnJS(handleDragEndInternal)(event.absoluteX, event.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  // Double-click detection handler
  const handleTap = useCallback(() => {
    if (!isDragging.value && onBuildTap) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < DOUBLE_CLICK_THRESHOLD) {
        // Double click detected - trigger the build tap
        onBuildTap(stack);
        lastTapRef.current = 0; // Reset after double-click
      } else {
        // First tap - set timer
        lastTapRef.current = now;
      }
    }
  }, [isDragging, onBuildTap, stack]);

  // If we don't have at least a bottom card, return null
  if (!bottom) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View ref={viewRef} style={[styles.container, animatedStyle]}>
        {/* Tap area - triggers onBuildTap on double-click */}
        <TouchableOpacity 
          style={styles.tapArea} 
          onPress={handleTap}
          activeOpacity={0.7}
        />
        
        {/* Base card — highest value */}
        <View style={styles.cardBottom}>
          <PlayingCard rank={bottom.rank} suit={bottom.suit} />
        </View>

        {/* Top card — offset for stacking effect */}
        <View style={styles.cardTop}>
          {top && <PlayingCard rank={top.rank} suit={top.suit} />}
        </View>

        {/* Build value badge */}
        <BuildValueBadge displayValue={displayValue} badgeColor={badgeColor} />

        {/* Type badge */}
        <TypeBadge label={badgeLabel} color={config?.badgeColor} />
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
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
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
});

export default TempStackView;
