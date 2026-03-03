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

export type DragSource = 'hand' | 'captured' | 'table' | null;

export function useDragOverlay() {
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  const startDrag = (
    card: Card,
    source: 'hand' | 'captured' | 'table',
    fingerX?: number,
    fingerY?: number
  ) => {
    console.log('[useDragOverlay] startDrag called, card:', card?.rank, card?.suit, 'source:', source, 'finger:', fingerX, fingerY);
    setDraggingCard(card);
    setDragSource(source);
    if (fingerX !== undefined && fingerY !== undefined) {
      // Center ghost under finger
      const newX = fingerX - CARD_WIDTH / 2;
      const newY = fingerY - CARD_HEIGHT / 2;
      console.log('[useDragOverlay] Setting overlay position:', { newX, newY, fingerX, fingerY });
      overlayX.value = newX;
      overlayY.value = newY;
    }
  };

  const moveDrag = (x: number, y: number) => {
    // Debug timing
    const startTime = Date.now();
    overlayX.value = x - CARD_WIDTH / 2;
    overlayY.value = y - CARD_HEIGHT / 2;
    const elapsed = Date.now() - startTime;
    if (elapsed > 2) {
      console.log('[useDragOverlay] moveDrag slow:', elapsed, 'ms');
    }
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
