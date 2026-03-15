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
  // Track pending drops for optimistic UI - card is dropped but server not confirmed
  const [pendingDropCard, setPendingDropCard] = useState<Card | null>(null);
  const [pendingDropSource, setPendingDropSource] = useState<DragSource>(null);
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

  // Mark a card as pending drop (optimistic UI - hide immediately after drop)
  const markPendingDrop = (card: Card, source: DragSource) => {
    console.log('[useDragOverlay] markPendingDrop: Card', card.rank, card.suit, 'from', source, '- HIDING card immediately (optimistic UI)');
    setPendingDropCard(card);
    setPendingDropSource(source);
  };

  // Clear pending drop (called when server confirms or action completes)
  const clearPendingDrop = () => {
    console.log('[useDragOverlay] clearPendingDrop: Card', pendingDropCard?.rank, pendingDropCard?.suit, 'cleared - server confirmed action');
    setPendingDropCard(null);
    setPendingDropSource(null);
  };

  // Check if a specific card is in pending drop state
  const isPendingDrop = (card: Card, source: DragSource): boolean => {
    if (!pendingDropCard || !pendingDropSource) return false;
    return pendingDropCard.rank === card.rank && 
           pendingDropCard.suit === card.suit && 
           pendingDropSource === source;
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
