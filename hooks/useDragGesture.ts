import { useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { CardType } from '../components/card';

interface UseDragGestureProps {
  draggable: boolean;
  disabled: boolean;
  onDragStart?: (card: CardType) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  onDragEnd?: (card: CardType, dropPosition: { x: number; y: number }) => void;
  card: CardType;
  dragThreshold?: number;
  useNativeDriver?: boolean;
}

interface DragGestureResult {
  pan: Animated.ValueXY;
  panResponder: any;
  isDragging: boolean;
  resetPosition: () => void;
}

/**
 * Hook for pure drag gesture mechanics
 * Handles PanResponder setup and animated position tracking
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
  useNativeDriver = true
}: UseDragGestureProps): DragGestureResult => {

  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);

  // Reset position helper
  const resetPosition = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver,
    }).start();
    pan.flattenOffset();
    setIsDragging(false);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => draggable && !disabled,
    onMoveShouldSetPanResponder: (event, gestureState) => {
      if (!draggable || disabled) return false;
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > dragThreshold;
    },

    onPanResponderGrant: () => {
      // Set initial offset - get current values
      const currentX = (pan.x as any)._value || 0;
      const currentY = (pan.y as any)._value || 0;
      pan.setOffset({
        x: currentX,
        y: currentY,
      });
      pan.setValue({ x: 0, y: 0 });
    },

    onPanResponderMove: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

      if (distance > dragThreshold && !isDragging) {
        setIsDragging(true);
        onDragStart?.(card);
      }

      if (isDragging) {
        // Update animated position using native driver
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver,
        })(event, gestureState);

        // Notify parent of position updates
        onDragMove?.(card, { x: gestureState.moveX, y: gestureState.moveY });
      }
    },

    onPanResponderRelease: (event, gestureState) => {
      const dropPosition = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY
      };

      onDragEnd?.(card, dropPosition);
      setIsDragging(false);
    },

    onPanResponderTerminate: () => {
      resetPosition();
    }
  });

  return {
    pan,
    panResponder,
    isDragging,
    resetPosition
  };
};
