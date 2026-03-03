import { useCallback } from 'react';
import { useDragOverlay } from '../drag/useDragOverlay';
import { CARD_WIDTH, CARD_HEIGHT, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT } from '../../utils/constants';

interface DropBounds {
  width: number;
  height: number;
}

interface UseDragHandlersProps {
  dragOverlay: ReturnType<typeof useDragOverlay>;
  dropBounds: React.MutableRefObject<DropBounds>;
  emitDragStart?: (card: any, source: string, position: { x: number; y: number }) => void;
  emitDragMove?: (card: any, position: { x: number; y: number }) => void;
  emitDragEnd?: (card: any, position: { x: number; y: number }, outcome: string, targetType?: string, targetId?: string) => void;
  findCapturePileAtPoint?: (x: number, y: number) => any;
  findCardAtPoint?: (x: number, y: number) => { id: string; card: any } | null;
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: string } | null;
  playerNumber: number;
  actions: any;
  onDragEndWrapper: (...args: any[]) => void;
}

export function useDragHandlers({
  dragOverlay,
  dropBounds,
  emitDragStart,
  emitDragMove,
  emitDragEnd,
  findCapturePileAtPoint,
  findCardAtPoint,
  findTempStackAtPoint,
  playerNumber,
  actions,
  onDragEndWrapper,
}: UseDragHandlersProps) {
  
  const getNormalizedPosition = useCallback((absX: number, absY: number) => {
    const tableWidth = dropBounds.current.width || DEFAULT_TABLE_WIDTH;
    const tableHeight = dropBounds.current.height || DEFAULT_TABLE_HEIGHT;
    return {
      x: Math.max(0, Math.min(1, absX / tableWidth)),
      y: Math.max(0, Math.min(1, absY / tableHeight))
    };
  }, [dropBounds]);

  const handleHandDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE HAND DRAG START =====');
    dragOverlay.startDrag(card, 'hand', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        console.warn('[GameBoard] Cannot emit dragStart - table bounds not ready');
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'hand', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition, dropBounds]);

  const handleTableDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE TABLE DRAG START =====');
    dragOverlay.startDrag(card, 'table', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        console.warn('[GameBoard] Cannot emit dragStart - table bounds not ready');
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'table', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition, dropBounds]);

  const handleCapturedDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE CAPTURED DRAG START =====');
    dragOverlay.startDrag(card, 'captured', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'captured', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition]);

  const handleDragMove = useCallback((absoluteX: number, absoluteY: number) => {
    const startTime = Date.now();
    
    dragOverlay.moveDrag(absoluteX, absoluteY);

    if (emitDragMove && dragOverlay.draggingCard) {
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragMove(dragOverlay.draggingCard, norm);
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 10) console.log(`[GameBoard] handleDragMove slow: ${elapsed}ms`);
  }, [dragOverlay, emitDragMove, getNormalizedPosition]);

  const handleDragEnd = useCallback((targetType?: string, outcome: 'success' | 'miss' | 'cancelled' = 'cancelled', targetId?: string) => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;
    
    if (emitDragEnd && dragOverlay.draggingCard) {
      const norm = getNormalizedPosition(absX, absY);
      emitDragEnd(dragOverlay.draggingCard, norm, outcome, targetType, targetId);
    }
    dragOverlay.endDrag();
    onDragEndWrapper(targetType, outcome, targetId);
  }, [dragOverlay, emitDragEnd, getNormalizedPosition, onDragEndWrapper]);

  const handleTableDragEnd = useCallback(() => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;

    // Check capture pile
    if (findCapturePileAtPoint) {
      const capturePile = findCapturePileAtPoint(absX, absY);
      if (capturePile) {
        handleDragEnd('capture', 'success');
        return;
      }
    }

    // Check loose cards
    const targetCardResult = findCardAtPoint?.(absX, absY);
    if (targetCardResult && dragOverlay.draggingCard) {
      actions.createTemp(dragOverlay.draggingCard, targetCardResult.card);
      handleDragEnd('card', 'success', targetCardResult.id);
      return;
    }

    // Check temp stacks
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && dragOverlay.draggingCard) {
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(dragOverlay.draggingCard, targetStack.stackId);
      }
      handleDragEnd('temp_stack', 'success', targetStack.stackId);
      return;
    }

    // Check build stacks
    if (targetStack && targetStack.stackType === 'build_stack' && dragOverlay.draggingCard) {
      handleDragEnd('stack', 'success', targetStack.stackId);
      return;
    }

    // Missed
    handleDragEnd(undefined, 'miss');
  }, [dragOverlay, findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd]);

  return {
    handleHandDragStart,
    handleTableDragStart,
    handleCapturedDragStart,
    handleDragMove,
    handleDragEnd,
    handleTableDragEnd,
  };
}
