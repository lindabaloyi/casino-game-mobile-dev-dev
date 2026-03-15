/**
 * Build Drag Hook
 * Encapsulates PanGesture, shared values, and drag callbacks.
 */

import { useCallback, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, SharedValue } from 'react-native-reanimated';
import { BuildStack } from '../types';
import { CapturePileBounds } from '../../../hooks/useDrag';

interface UseBuildDragProps {
  /** The build stack being dragged */
  stack: BuildStack;
  /** Whether dragging is enabled */
  canDrag: boolean;
  /** Current player number */
  playerNumber?: number;
  /** Find capture pile at point callback */
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  /** Drag start callback */
  onDragStart?: (stack: BuildStack) => void;
  /** Drag move callback */
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  /** Drag end callback */
  onDragEnd?: (stack: BuildStack) => void;
  /** Drop to capture callback */
  onDropToCapture?: (stack: BuildStack) => void;
}

interface UseBuildDragResult {
  /** Pan gesture for drag handling */
  panGesture: ReturnType<typeof Gesture.Pan>;
  /** Animated style for transform */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Whether currently dragging */
  isDragging: SharedValue<boolean>;
}

export function useBuildDrag({
  stack,
  canDrag,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
}: UseBuildDragProps): UseBuildDragResult {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDragStartInternal = useCallback(() => {
    if (onDragStart) {
      onDragStart(stack);
    }
  }, [onDragStart, stack]);

  // Drag move handler
  const handleDragMoveInternal = useCallback((x: number, y: number) => {
    if (onDragMove) {
      onDragMove(x, y);
    }
  }, [onDragMove]);

  // Drag end handler
  const handleDragEndInternal = useCallback((absX: number, absY: number, stack: BuildStack) => {
    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;

    console.log(`[useBuildDrag] Drag end - absX: ${absX}, absY: ${absY}, playerNumber: ${playerNumber}`);

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      console.log(`[useBuildDrag] findCapturePileAtPoint result:`, pile);
      
      if (pile && pile.playerIndex === playerNumber) {
        console.log('[useBuildDrag] Dropped on own capture pile:', pile);
        if (onDropToCapture) {
          onDropToCapture(stack);
        }
        return;
      }
    }

    // Otherwise, call normal onDragEnd
    console.log('[useBuildDrag] Not dropped on capture pile - calling onDragEnd');
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, playerNumber, translateX, translateY, isDragging]);

  // Create the pan gesture
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
      // This will be called with the stack - we need to pass it differently
      // For now, we'll handle this in the component
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  return {
    panGesture,
    animatedStyle,
    isDragging,
  };
}

export default useBuildDrag;
