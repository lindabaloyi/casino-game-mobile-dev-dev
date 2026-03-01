/**
 * useDragOverlay
 * Hook for managing drag overlay state and ghost card positioning.
 */

import { useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';

const CARD_WIDTH = 56;
const CARD_HEIGHT = 84;

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export type DragSource = 'hand' | 'captured' | null;

export function useDragOverlay() {
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  const startDrag = (card: Card, source: 'hand' | 'captured') => {
    setDraggingCard(card);
    setDragSource(source);
  };

  const moveDrag = (x: number, y: number) => {
    overlayX.value = x - CARD_WIDTH / 2;
    overlayY.value = y - CARD_HEIGHT / 2;
  };

  const endDrag = () => {
    setDraggingCard(null);
    setDragSource(null);
  };

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: overlayX.value,
    top: overlayY.value,
    zIndex: 1000,
  }));

  return {
    draggingCard,
    dragSource,
    overlayX,
    overlayY,
    startDrag,
    moveDrag,
    endDrag,
    ghostStyle,
  };
}
