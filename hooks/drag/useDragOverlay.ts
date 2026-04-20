/**
 * useDragOverlay
 * Hook for managing drag overlay state and ghost card positioning.
 * 
 * OPTIMIZATION: Uses UI thread shared values for ghost position to avoid
 * JS bridge crossings during drag. This eliminates lag on mobile devices.
 */

import { useState, useCallback, useRef } from 'react';
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
  const [pendingDropCard, setPendingDropCard] = useState<Card | null>(null);
  const [pendingDropSource, setPendingDropSource] = useState<DragSource>(null);
  // React state for card identity (passed to DragGhost for rendering)
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  
  // UI thread shared values for ghost position - no JS bridge crossing during drag
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  
  // Store card data as shared value for worklet access
  const draggingCardData = useSharedValue<Card | null>(null);
  const draggingCardSource = useSharedValue<DragSource>(null);

  const startDrag = useCallback((
    card: Card,
    source: 'hand' | 'captured' | 'table',
    fingerX?: number,
    fingerY?: number
  ) => {
    // Set React state for card identity (for rendering)
    setDraggingCard(card);
    // Set shared values for UI thread updates
    draggingCardData.value = card;
    draggingCardSource.value = source;
    isDragging.value = true;
    
    if (fingerX !== undefined && fingerY !== undefined) {
      overlayX.value = fingerX - CARD_WIDTH / 2;
      overlayY.value = fingerY - CARD_HEIGHT / 2;
    }
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    // Update shared values from JS thread - this guarantees visual update
    overlayX.value = x - CARD_WIDTH / 2;
    overlayY.value = y - CARD_HEIGHT / 2;
  }, []);

  const endDrag = useCallback(() => {
    setDraggingCard(null);
    isDragging.value = false;
    draggingCardData.value = null;
    draggingCardSource.value = null;
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

  // Animated style for ghost - runs on UI thread
  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: overlayX.value,
    top: overlayY.value,
    zIndex: 1000,
    opacity: isDragging.value ? 1 : 0,
  }));

  return {
    // Card identity for DragGhost rendering (via React state - updates once per drag)
    draggingCard,
    dragSource: null,
    pendingDropCard,
    pendingDropSource,
    // Shared values for direct UI thread updates in gestures
    overlayX,
    overlayY,
    isDragging,
    draggingCardData,
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