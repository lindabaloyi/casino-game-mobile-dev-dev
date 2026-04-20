/**
 * useDragOverlay
 * Hook for managing drag overlay state and ghost card positioning.
 */

import { useState, useCallback } from 'react';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

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
  const [pendingDropCard, setPendingDropCard] = useState<Card | null>(null);
  const [pendingDropSource, setPendingDropSource] = useState<DragSource>(null);
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  const startDrag = useCallback((
    card: Card,
    source: 'hand' | 'captured' | 'table',
    fingerX?: number,
    fingerY?: number
  ) => {
    setDraggingCard(card);
    setDragSource(source);
    if (fingerX !== undefined && fingerY !== undefined) {
      const newX = fingerX - CARD_WIDTH / 2;
      const newY = fingerY - CARD_HEIGHT / 2;
      overlayX.value = newX;
      overlayY.value = newY;
    }
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    overlayX.value = x - CARD_WIDTH / 2;
    overlayY.value = y - CARD_HEIGHT / 2;
  }, []);

  const endDrag = useCallback(() => {
    setDraggingCard(null);
    setDragSource(null);
  }, []);

  const markPendingDrop = useCallback((card: Card, source: DragSource) => {
    setPendingDropCard(card);
    setPendingDropSource(source);
  }, []);

  const clearPendingDrop = useCallback(() => {
    setPendingDropCard(null);
    setPendingDropSource(null);
  }, []);

  const isPendingDrop = useCallback((card: Card, source: DragSource): boolean => {
    if (!pendingDropCard || !pendingDropSource) return false;
    return pendingDropCard.rank === card.rank && 
           pendingDropCard.suit === card.suit && 
           pendingDropSource === source;
  }, [pendingDropCard, pendingDropSource]);

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: overlayX.value,
    top: overlayY.value,
    zIndex: 1000,
  }));

  return {
    draggingCard,
    dragSource,
    pendingDropCard,
    pendingDropSource,
    overlayX,
    overlayY,
    startDrag,
    moveDrag,
    endDrag,
    markPendingDrop,
    clearPendingDrop,
    isPendingDrop,
    ghostStyle,
  };
}

export default useDragOverlay;