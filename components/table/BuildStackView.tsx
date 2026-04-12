/**
 * BuildStackView
 * Renders a build_stack (accepted temp stack).
 * 
 * This component has been refactored to follow the Single Responsibility Principle:
 * - useBuildDisplayValue hook: computes effectiveSum and displayValue
 * - useBuildTeamInfo hook: derives team, colors, owner label
 * - BuildValueBadge: renders the value badge
 * - OwnerIndicator: renders the owner badge
 * - BuildCards: renders the stacked cards
 * 
 * Characteristics:
 * - Draggable by owner when there's a pending extension (can capture instead of accepting)
 * - Shows owner indicator (P1 or P2)
 * - Shows build value badge
 * - Shows EXTEND indicator when extending
 * - Always shows 2 cards (base and top) like TempStack
 * - In party mode, shows team colors and "friendly"/"enemy" indicator
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { BuildStack } from './types';
import { TempStackBounds } from '../../hooks/useDrag';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';
import { useBuildDisplayValue } from './hooks/useBuildDisplayValue';
import { useBuildTeamInfo } from './hooks/useBuildTeamInfo';
import { BuildValueBadge, OwnerIndicator, BuildCards } from './components';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = CARD_WIDTH;
const CARD_H       = CARD_HEIGHT;
const BADGE_H      = 22;
const STACK_PAD    = 0;

// Re-export constants for backwards compatibility
export { CANONICAL_PURPLE, PLAYER_1_GOLD, PLAYER_2_PURPLE } from './hooks/useBuildTeamInfo';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: BuildStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion: number;
  registerBuildStack: (stackId: string, bounds: BuildStackBounds) => void;
  unregisterBuildStack: (stackId: string) => void;
  /** Current player index (for party mode team colors) */
  currentPlayerIndex?: number;
  /** Whether this is party mode (4-player) */
  isPartyMode?: boolean;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** Callback when build is tapped - for Shiya selection */
  onBuildTap?: (stack: BuildStack) => void;
  // Drag props - enabled when build has pending extension
  isMyTurn?: boolean;
  playerNumber?: number;
  findCapturePileAtPoint?: (x: number, y: number) => any;
  onDragStart?: (stack: BuildStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: BuildStack) => void;
  onDropToCapture?: (stack: BuildStack) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BuildStackView({ 
  stack, 
  layoutVersion, 
  registerBuildStack, 
  unregisterBuildStack,
  currentPlayerIndex,
  isPartyMode = false,
  playerCount,
  onBuildTap,
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

  // Get cards from stack
  const bottom = stack.cards[0];
  
  // Check if there's a pending extension (supports both old looseCard and new cards format)
  const pendingExtension = stack.pendingExtension;
  const isExtending = !!(pendingExtension?.looseCard || pendingExtension?.cards);

  // Check if there's a pending capture (opponent building to capture)
  const pendingCapture = stack.pendingCapture;
  const isCapturing = !!(pendingCapture?.cards && pendingCapture.cards.length > 0);

  // Get pending cards from extension in order they were added
  const pendingCards = useMemo(() => 
    pendingExtension?.cards?.map(p => p.card) ?? 
    (pendingExtension?.looseCard ? [pendingExtension.looseCard] : [])
  , [pendingExtension]);

  // Get pending cards from capture in order they were added
  const pendingCaptureCards = useMemo(() => 
    pendingCapture?.cards?.map(p => p.card) ?? []
  , [pendingCapture]);

  // The card shown on top: pending capture card if any, otherwise pending extension, otherwise original top
  const top = pendingCaptureCards.length > 0 
    ? pendingCaptureCards[pendingCaptureCards.length - 1] 
    : pendingCards.length > 0 
      ? pendingCards[pendingCards.length - 1]
      : stack.cards[stack.cards.length - 1];

  // Build is draggable when:
  // - It's the player's turn
  // - They own the build
  // - There's a pending extension on the build
  const canDrag = isMyTurn && 
    playerNumber !== undefined && 
    stack.owner === playerNumber && 
    isExtending;

  // ── Use extracted hooks ───────────────────────────────────────────────────

  // Compute display value - prioritize capture over extension (capture shows opponent stealing)
  const captureDisplayValue = useBuildDisplayValue({
    value: stack.value,
    pendingCards: pendingCaptureCards,
  });

  const extensionDisplayValue = useBuildDisplayValue({
    value: stack.value,
    pendingCards,
  });

  // Use capture display if capturing, otherwise extension display
  const { effectiveSum, displayValue } = isCapturing 
    ? captureDisplayValue 
    : extensionDisplayValue;

  console.log('[BuildStackView] Display calc:', {
    stackId: stack.stackId,
    stackValue: stack.value,
    isCapturing,
    isExtending,
    pendingCardsValues: pendingCards.map(c => c.value),
    effectiveSum,
    displayValue
  });

  // Get team info and badge color
  const { badgeColor } = useBuildTeamInfo({
    owner: stack.owner,
    isPartyMode,
    playerCount,
    isExtending,
    isCapturing,
    effectiveSum,
  });

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

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      
      if (pile && pile.playerIndex === playerNumber) {
        if (onDropToCapture) {
          onDropToCapture(stack);
        }
        return;
      }
    }

    // Otherwise, call normal onDragEnd
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, stack, playerNumber, translateX, translateY, isDragging]);

  // Create pan gesture
  const panGesture = useMemo(() => 
    Gesture.Pan()
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
        runOnJS(handleDragEndInternal)(event.absoluteX, event.absoluteY);
      })
  , [canDrag, handleDragStartInternal, handleDragMoveInternal, handleDragEndInternal]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  // ── Position registration ─────────────────────────────────────────────────
  const onLayout = useCallback(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerBuildStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
        });
      });
    });
  }, [stack.stackId, stack.owner, registerBuildStack]);

  // Re-measure on table reflow
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerBuildStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
        });
      });
    });
  }, [layoutVersion, stack.stackId, stack.owner, registerBuildStack]);

  useEffect(() => {
    return () => unregisterBuildStack(stack.stackId);
  }, [stack.stackId, unregisterBuildStack]);

  if (!bottom || !top) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        ref={viewRef} 
        style={[styles.container, animatedStyle]} 
        onLayout={onLayout}
      >
        {/* Tap handler for Shiya selection - only works when not dragging */}
        <TouchableOpacity 
          style={styles.tapArea} 
          onPress={() => {
            if (!isDragging.value && onBuildTap) {
              onBuildTap(stack);
            }
          }} 
          activeOpacity={0.7}
        />
        
        {/* Use extracted BuildCards component - no offset, cards stack directly */}
        <BuildCards bottom={bottom} top={top} stackOffset={0} />

        {/* Use extracted BuildValueBadge component */}
        <BuildValueBadge displayValue={displayValue} badgeColor={badgeColor} />

        {/* Use extracted OwnerIndicator component */}
        <OwnerIndicator owner={stack.owner} isPartyMode={isPartyMode} playerCount={playerCount} />
      </Animated.View>
    </GestureDetector>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width:    CARD_W + STACK_PAD,
    height:   CARD_H + BADGE_H,
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
});

export default BuildStackView;

