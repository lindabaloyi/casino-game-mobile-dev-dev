import { useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { CardType } from '../components/cards/card';

interface UseDragGestureProps {
  draggable: boolean;
  disabled: boolean;
  onDragStart?: (card: CardType) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  onDragEnd?: (card: CardType, dropPosition: { x: number; y: number }) => void;
  card: CardType;
  dragThreshold?: number;
}

interface DragGestureResult {
  gesture: any; // Gesture.Pan() instance
  animatedStyle: any; // Animated style object
  isDragging: boolean;
  resetPosition: () => void;
}

/**
 * Hook for pure drag gesture mechanics using Gesture Handler + Reanimated
 * Handles gesture detection and animated position tracking on UI thread
 * No business logic, drop zones, or game rules - just drag mechanics
 */
export const useDragGesture = ({
  draggable,
  disabled,
  onDragStart,
  onDragMove,
  onDragEnd,
  card,
  dragThreshold = 8,
}: UseDragGestureProps): DragGestureResult => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const gesture = Gesture.Pan()
    .enabled(draggable && !disabled)
    .minDistance(dragThreshold)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(setIsDragging)(true);
      if (onDragStart) {
        runOnJS(onDragStart)(card);
      }
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
      if (onDragMove) {
        runOnJS(onDragMove)(card, { x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onEnd((event) => {
      const dropPosition = { x: event.absoluteX, y: event.absoluteY };
      runOnJS(setIsDragging)(false);
      if (onDragEnd) {
        runOnJS(onDragEnd)(card, dropPosition);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const resetPosition = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  return {
    gesture, // attach to <GestureDetector gesture={gesture}>...</GestureDetector>
    animatedStyle, // apply to your <Animated.View style={animatedStyle}>...</Animated.View>
    isDragging,
    resetPosition,
  };
};
