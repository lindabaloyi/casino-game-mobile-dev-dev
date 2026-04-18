import { useCallback, useRef } from 'react';
import { useDragOverlay } from '../drag/useDragOverlay';

// Network emit debounce interval (100ms = 10fps for multiplayer sync)
const NETWORK_EMIT_INTERVAL_MS = 100;
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
  // Modal callbacks for steal build
  openStealModal?: (card: any, stack: any) => void;
  // Table data for finding full build stack info
  table?: any[];
  // Sound callback for table card drop (played when card is dropped successfully)
  onTableCardDragDrop?: () => void;
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
  openStealModal,
  table,
  onTableCardDragDrop,
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
    // Always start the drag overlay - don't return early!
    dragOverlay.startDrag(card, 'hand', absoluteX, absoluteY);
    
    // Check bounds AFTER starting the drag
    // Note: Bounds may be 0 on first drag, but we still need to emit for ghost sync
    const boundsReady = dropBounds.current && dropBounds.current.width > 0 && dropBounds.current.height > 0;
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      // Only skip emission if bounds not ready, but still emit for ghost sync
      if (!boundsReady) {
        // Emit with default bounds if not ready - opponent needs to see the ghost
        const norm = { x: 0.5, y: 0.5 }; // Center of screen as fallback
        emitDragStart(card, 'hand', norm);
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'hand', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition, dropBounds]);

  const handleTableDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    dragOverlay.startDrag(card, 'table', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'table', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition, dropBounds]);

  const handleCapturedDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    dragOverlay.startDrag(card, 'captured', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'captured', norm);
    }
  }, [dragOverlay, emitDragStart, getNormalizedPosition]);

  const lastNetworkEmitTime = useRef(0);

  const handleDragMove = useCallback((absoluteX: number, absoluteY: number) => {
    // UI thread visual update (shared value)
    dragOverlay.moveDrag(absoluteX, absoluteY);

    // Network emit debounced - only send every 100ms
    if (emitDragMove && dragOverlay.draggingCard) {
      const now = Date.now();
      if (now - lastNetworkEmitTime.current >= NETWORK_EMIT_INTERVAL_MS) {
        lastNetworkEmitTime.current = now;
        const norm = getNormalizedPosition(absoluteX, absoluteY);
        emitDragMove(dragOverlay.draggingCard, norm);
      }
    }
  }, [dragOverlay, emitDragMove, getNormalizedPosition]);

  const handleDragEnd = useCallback((targetType?: string, outcome: 'success' | 'miss' | 'cancelled' = 'cancelled', targetId?: string) => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;
    
    const card = dragOverlay.draggingCard;
    const source = dragOverlay.dragSource;
    
    // OPTIMISTIC UI: Mark card as pending drop BEFORE sending to server
    // This hides the card immediately without waiting for server response
    if (card && source && outcome === 'success') {
      dragOverlay.markPendingDrop(card, source);
    }
    
    if (emitDragEnd && card) {
      const norm = getNormalizedPosition(absX, absY);
      emitDragEnd(card, norm, outcome, targetType, targetId);
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
        // Play sound on successful drop
        if (onTableCardDragDrop) {
          onTableCardDragDrop();
        }
        // Pass targetId as the player index for capture pile
        handleDragEnd('capture', 'success', String(capturePile.playerIndex));
        return;
      }
    }

    // Check loose cards
    const targetCardResult = findCardAtPoint?.(absX, absY);
    if (targetCardResult && dragOverlay.draggingCard) {
      const isSameCard = targetCardResult.card.rank === dragOverlay.draggingCard.rank &&
                         targetCardResult.card.suit === dragOverlay.draggingCard.suit;
      const isFromTable = dragOverlay.dragSource === 'table';
      
      // Don't allow temp creation from table cards or onto same card - treat as miss
      if (isSameCard || isFromTable) {
        handleDragEnd(undefined, 'miss');
        return;
      }
      
      // Valid - proceed with createTemp
      if (onTableCardDragDrop) {
        onTableCardDragDrop();
      }
      actions.createTemp(dragOverlay.draggingCard, targetCardResult.card, dragOverlay.dragSource || 'hand');
      handleDragEnd('card', 'success', targetCardResult.id);
      return;
    }

    // Check temp stacks
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && dragOverlay.draggingCard) {
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(dragOverlay.draggingCard, targetStack.stackId, dragOverlay.dragSource || 'hand');
      }
      // Play sound on successful drop
      if (onTableCardDragDrop) {
        onTableCardDragDrop();
      }
      handleDragEnd('temp_stack', 'success', targetStack.stackId);
      return;
    }

    // Check build stacks
    if (targetStack && targetStack.stackType === 'build_stack' && dragOverlay.draggingCard) {
      // Find full build stack from table
      const fullStack = table?.find((tc: any) => tc.stackId === targetStack.stackId);
      
      // Delegated to unified handler in GameBoard - just pass through to stackDrop
      // The hasBase validation is now handled centrally in GameBoard.handleDropOnStack
      if (targetStack.owner !== playerNumber) {
        // Play sound on successful drop
        if (onTableCardDragDrop) {
          onTableCardDragDrop();
        }
        // Opponent's build - delegate to GameBoard's unified handler
        handleDragEnd('stack', 'success', targetStack.stackId);
        return;
      }
      // Play sound on successful drop
      if (onTableCardDragDrop) {
        onTableCardDragDrop();
      }
      handleDragEnd('stack', 'success', targetStack.stackId);
      return;
    }

    // Missed - no sound
    handleDragEnd(undefined, 'miss');
  }, [dragOverlay, findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd, onTableCardDragDrop]);

  return {
    handleHandDragStart,
    handleTableDragStart,
    handleCapturedDragStart,
    handleDragMove,
    handleDragEnd,
    handleTableDragEnd,
  };
}
