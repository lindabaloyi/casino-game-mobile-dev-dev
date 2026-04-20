import { useCallback } from 'react';
import { useDragContext } from '../drag/DragContext';
import { CARD_WIDTH, CARD_HEIGHT, DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT } from '../../utils/constants';

interface DropBounds {
  width: number;
  height: number;
}

interface UseDragHandlersProps {
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
  const { markPendingDrop, clearPendingDrop, draggingCard, dragSource } = useDragContext();

  const getNormalizedPosition = useCallback((absX: number, absY: number) => {
    const tableWidth = dropBounds.current.width || DEFAULT_TABLE_WIDTH;
    const tableHeight = dropBounds.current.height || DEFAULT_TABLE_HEIGHT;
    return {
      x: Math.max(0, Math.min(1, absX / tableWidth)),
      y: Math.max(0, Math.min(1, absY / tableHeight))
    };
  }, [dropBounds]);

  const handleHandDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[useDragHandlers] handleHandDragStart (JS CALLBACK - multiplayer sync):', {
      card: card ? `${card.rank}${card.suit}` : null,
      absoluteX,
      absoluteY,
      hasEmitDragStart: !!emitDragStart,
    });
    // Check bounds AFTER starting the drag
    // Note: Bounds may be 0 on first drag, but we still need to emit for ghost sync
    const boundsReady = dropBounds.current && dropBounds.current.width > 0 && dropBounds.current.height > 0;

    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      // Only skip emission if bounds not ready, but still emit for ghost sync
      if (!boundsReady) {
        // Emit with default bounds if not ready - opponent needs to see the ghost
        const norm = { x: 0.5, y: 0.5 }; // Center of screen as fallback
        console.log('[useDragHandlers] handleHandDragStart - bounds not ready, using default');
        emitDragStart(card, 'hand', norm);
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'hand', norm);
    }
  }, [emitDragStart, getNormalizedPosition, dropBounds]);

  const handleTableDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        return;
      }
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'table', norm);
    }
  }, [emitDragStart, getNormalizedPosition, dropBounds]);

  const handleCapturedDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragStart(card, 'captured', norm);
    }
  }, [emitDragStart, getNormalizedPosition]);

  const handleDragMove = useCallback((absoluteX: number, absoluteY: number) => {
    if (emitDragMove && draggingCard.value) {
      const norm = getNormalizedPosition(absoluteX, absoluteY);
      emitDragMove(draggingCard.value, norm);
    }
  }, [emitDragMove, getNormalizedPosition, draggingCard]);

  const handleDragEnd = useCallback((targetType?: string, outcome: 'success' | 'miss' | 'cancelled' = 'cancelled', targetId?: string) => {
    const card = draggingCard.value;
    const source = dragSource.value;

    // OPTIMISTIC UI: Mark card as pending drop BEFORE sending to server
    // This hides the card immediately without waiting for server response
    if (card && source && outcome === 'success') {
      markPendingDrop(card, source);
    }

    // Use last known position or default to center
    const absX = card ? CARD_WIDTH / 2 : CARD_WIDTH / 2;
    const absY = card ? CARD_HEIGHT / 2 : CARD_HEIGHT / 2;

    if (emitDragEnd && card) {
      const norm = getNormalizedPosition(absX, absY);
      emitDragEnd(card, norm, outcome, targetType, targetId);
    }
    clearPendingDrop();
    onDragEndWrapper(targetType, outcome, targetId);
  }, [emitDragEnd, getNormalizedPosition, onDragEndWrapper, draggingCard, dragSource, markPendingDrop, clearPendingDrop]);

  const handleTableDragEnd = useCallback(() => {
    const card = draggingCard.value;
    const source = dragSource.value;

    // Default position to center of table
    const absX = CARD_WIDTH / 2;
    const absY = CARD_HEIGHT / 2;

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
    if (targetCardResult && card) {
      const isSameCard = targetCardResult.card.rank === card.rank &&
                         targetCardResult.card.suit === card.suit;
      const isFromTable = source === 'table';

      // Don't allow temp creation from table cards or onto same card - treat as miss
      if (isSameCard || isFromTable) {
        handleDragEnd(undefined, 'miss');
        return;
      }

      // Valid - proceed with createTemp
      if (onTableCardDragDrop) {
        onTableCardDragDrop();
      }
      actions.createTemp(card, targetCardResult.card, source || 'hand');
      handleDragEnd('card', 'success', targetCardResult.id);
      return;
    }

    // Check temp stacks
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && card) {
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(card, targetStack.stackId, source || 'hand');
      }
      // Play sound on successful drop
      if (onTableCardDragDrop) {
        onTableCardDragDrop();
      }
      handleDragEnd('temp_stack', 'success', targetStack.stackId);
      return;
    }

    // Check build stacks
    if (targetStack && targetStack.stackType === 'build_stack' && card) {
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
  }, [findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd, onTableCardDragDrop, draggingCard, dragSource]);

  return {
    handleHandDragStart,
    handleTableDragStart,
    handleCapturedDragStart,
    handleDragMove,
    handleDragEnd,
    handleTableDragEnd,
  };
}
