import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, TableCard } from '../multiplayer/server/game-logic/game-state';
import { BuildCardRenderer } from './table/BuildCardRenderer';
import TableDraggableCard from './table/TableDraggableCard';
import { useTableInteractionManager } from './table/TableInteractionManager';
import { TempStackRenderer } from './table/TempStackRenderer';

// Removed unused screenWidth variable

interface TableCardsProps {
  tableCards?: TableCard[];
  onDropOnCard?: (draggedItem: any, targetInfo: any) => boolean;
  currentPlayer: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onTableCardDragStart?: (card: any) => void;
  onTableCardDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onStagingAccept?: (stackId: string) => void;
  onStagingReject?: (stackId: string) => void;
  sendAction?: (action: any) => void; // For build augmentation
}

// Helper function to get card type from union types
function getCardType(card: TableCard): 'loose' | 'temporary_stack' | 'build' {
  if ('type' in card) return card.type;
  return 'loose';  // Card objects are implicitly loose cards without type property
}

// Removed unused lastDropPosition variable

const TableCards: React.FC<TableCardsProps> = ({
  tableCards = [],
  onDropOnCard,
  currentPlayer,
  onFinalizeStack,
  onCancelStack,
  onTableCardDragStart,
  onTableCardDragEnd,
  onStagingAccept,
  onStagingReject,
  sendAction
}) => {
  const tableRef = useRef<View>(null);
  const tableBoundsRef = useRef<any>(null);  // 🎯 NEW: Store table bounds for overlap detection

  // 🔬 ONE-TIME LOG ON COMPONENT MOUNT
  React.useEffect(() => {
    console.log('🔬 [INITIAL_DATA_STRUCTURE] TableCards mounted with:', {
      tableCardsCount: tableCards.length,
      tableCardsStructure: tableCards.map((card, idx) => ({
        index: idx,
        type: getCardType(card),
        isObject: typeof card === 'object',
        keys: typeof card === 'object' ? Object.keys(card) : [],
        sample: card && typeof card === 'object' ?
          JSON.parse(JSON.stringify(card)) : card
      })),
      propsStructure: {
        hasOnDropOnCard: !!onDropOnCard,
        hasCurrentPlayer: currentPlayer !== undefined,
        allProps: Object.keys({tableCards, onDropOnCard, currentPlayer, onFinalizeStack, onCancelStack, onTableCardDragStart, onTableCardDragEnd, onStagingAccept, onStagingReject})
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only run once

  // 🎯 NEW: Track drag position for overlap detection
  const [dragPosition, setDragPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  // 🎯 NEW: Enhanced drag handlers to track position
  const handleTableCardDragStartWithPosition = React.useCallback((card: any) => {
    console.log(`[DRAG-TRACK] Table card drag started:`, card);
    setIsDragging(true);
    onTableCardDragStart?.(card);
  }, [onTableCardDragStart]);

  const handleTableCardDragEndWithPosition = React.useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[DRAG-TRACK] Table card drag ended`);
    setIsDragging(false);
    setDragPosition({ x: 0, y: 0 }); // Reset
    onTableCardDragEnd?.(draggedItem, dropPosition);
  }, [onTableCardDragEnd]);

  // Removed unused updateDragPosition function

  // Use table interaction manager for drop handling
  const { handleDropOnStack } = useTableInteractionManager({
    tableCards,
    onDropOnCard: onDropOnCard || (() => false)
  });

  // Track locally cancelled staging stacks for immediate UI updates
  const [cancelledStacks] = React.useState<Set<string>>(new Set());

  // Simplified staging reject handler - just call server-side cancel
  const handleStagingRejectWithLocalState = React.useCallback((stackId: string) => {
    console.log(`[TableCards] ❌ CANCEL STAGING - CALLING SERVER-SIDE CANCEL:`, {
      stackId,
      action: 'server-side-cancelStagingStack',
      timestamp: Date.now(),
      expectedOutcome: 'server-will-restore-cards-to-original-positions'
    });

    // Call the server-side cancel handler - let server handle all restoration
    onStagingReject?.(stackId);

    console.log(`[TableCards] ✅ CANCEL REQUEST SENT TO SERVER:`, {
      stackId,
      serverWillHandle: 'position-aware-card-restoration',
      clientWillReceive: 'updated-game-state-with-restored-cards'
    });
  }, [onStagingReject]);

  // FIXED: Preserve original positions when expanding cancelled stacks
  const visibleTableCards = React.useMemo(() => {
    console.log(`[TableCards] 🔄 POSITION-PRESERVING EXPANSION:`, {
      totalTableCards: tableCards.length,
      cancelledStacksCount: cancelledStacks.size,
      cancelledStacksList: Array.from(cancelledStacks)
    });

    // Use flatMap to expand cancelled temp stacks into individual cards
    // while maintaining original array structure and positions
    const transformedCards = tableCards.flatMap((tableItem, originalIndex) => {
      // Handle null/undefined items
      if (!tableItem) {
        console.warn(`[TableCards] ⚠️ Found null table item at index ${originalIndex}`);
        return [];
      }

      const itemType = getCardType(tableItem);

      // Check if this is a cancelled temp stack
      if (itemType === 'temporary_stack') {
        const stackId = (tableItem as any).stackId;
        const isCancelled = cancelledStacks.has(stackId);

        if (isCancelled) {
          console.log(`[TableCards] 🔄 EXPANDING CANCELLED STACK IN-PLACE:`, {
            stackId,
            originalIndex,
            cardsCount: (tableItem as any).cards?.length || 0,
            action: 'replace-with-individual-cards-at-same-position'
          });

          // Return the individual cards from the stack
          const stackCards = (tableItem as any).cards || [];

          // Handle edge case: empty cards array
          if (stackCards.length === 0) {
            console.warn(`[TableCards] ⚠️ Cancelled stack ${stackId} has no cards`);
            return []; // Remove from array entirely
          }

          // Add position metadata to track original location
          return stackCards.map((card: any, cardIndex: number) => ({
            ...card,
            // Simplified metadata names
            _cancelledStackId: stackId,
            _pos: originalIndex, // Original stack position
            _inStackIdx: cardIndex // Index within the original stack
          }));
        }

        // Not cancelled - keep the temp stack as-is
        console.log(`[TableCards] ✅ PRESERVING ACTIVE TEMP STACK:`, {
          stackId,
          originalIndex,
          cardsCount: (tableItem as any).cards?.length || 0
        });
        return [tableItem];
      }

      // Not a temp stack - keep as-is
      return [tableItem];
    });

    console.log(`[TableCards] ✅ POSITION PRESERVATION COMPLETE:`, {
      originalCount: tableCards.length,
      transformedCount: transformedCards.length,
      expansionCount: transformedCards.length - tableCards.length,

      // Detailed transformation tracking
      transformationMap: {
        originalItems: tableCards.map((item, i) => ({
          index: i,
          type: item ? getCardType(item) : 'null',
          stackId: item && getCardType(item) === 'temporary_stack' ? (item as any).stackId : null,
          cancelled: item && getCardType(item) === 'temporary_stack' ? cancelledStacks.has((item as any).stackId) : false
        })),
        transformedItems: transformedCards.map((item, i) => ({
          index: i,
          type: item ? getCardType(item) : 'null',
          fromCancelledStack: !!(item as any)._cancelledStackId,
          originalPosition: (item as any)._pos || null
        }))
      }
    });

    return transformedCards;
  }, [tableCards, cancelledStacks]);

  return (
    <View
      ref={tableRef}
      style={styles.tableContainer}
      onLayout={() => {  // 🎯 FIX 1: Use measureInWindow for proper coordinates
        tableRef.current?.measureInWindow((x, y, width, height) => {
          tableBoundsRef.current = { x, y, width, height };
          console.log('[TABLE-BOUNDS] Captured via measureInWindow:', tableBoundsRef.current);
        });
      }}
    >
      <View style={styles.tableArea}>
        {visibleTableCards.length === 0 ? (
          <View style={styles.emptyTable}>
            {/* Empty table area - drop zone active */}
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {visibleTableCards.map((tableItem, visibleIndex) => {
              // Find the original position for this card using metadata
              const originalPosition = (tableItem as any)._pos !== undefined
                ? (tableItem as any)._pos
                : visibleIndex; // Fallback for non-expanded cards

              // Calculate z-index hierarchy: later cards stack higher
              const baseZIndex = visibleIndex + 1;
              const dragZIndex = 100000;

              console.log(`[TableCards] 📍 POSITION MAPPING:`, {
                visibleIndex,
                originalPosition,
                card: getCardType(tableItem) === 'loose' ?
                  `${(tableItem as any).rank}${(tableItem as any).suit}` : 'stack',
                fromCancelledStack: !!(tableItem as any)._cancelledStackId
              });

              const itemType = getCardType(tableItem);

              // 🎯 NEW: Simple table overlap detection (no useMemo needed)
              const isOverTable =
                isDragging &&
                tableBoundsRef.current &&
                dragPosition.x >= tableBoundsRef.current.x &&
                dragPosition.x <= tableBoundsRef.current.x + tableBoundsRef.current.width &&
                dragPosition.y >= tableBoundsRef.current.y &&
                dragPosition.y <= tableBoundsRef.current.y + tableBoundsRef.current.height;

              // Simplified z-index: drag z-index guarantees layering priority
              const dynamicZIndex = baseZIndex;

              console.log(`[Z-INDEX] Card ${originalPosition}: z=${dynamicZIndex}, overTable=${isOverTable}, pos=(${dragPosition?.x}, ${dragPosition?.y})`);

              if (itemType === 'loose') {
                return (
                  <TableDraggableCard
                    key={`loose-${originalPosition}-${(tableItem as Card).rank}-${(tableItem as Card).suit}`}
                    card={tableItem as Card}
                    stackId={`loose-${originalPosition}`}
                    index={originalPosition}
                    dragZIndex={dragZIndex}
                    onDragStart={handleTableCardDragStartWithPosition}
                    onDragEnd={handleTableCardDragEndWithPosition}
                    currentPlayer={currentPlayer}
                  />
                );
              } else if (itemType === 'build') {
                return (
                  <BuildCardRenderer
                    key={`table-build-${originalPosition}`}
                    tableItem={tableItem}
                    index={originalPosition}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    sendAction={sendAction}
                  />
                );
              } else if (itemType === 'temporary_stack') {
                return (
                  <TempStackRenderer
                    key={`staging-container-${originalPosition}`}
                    tableItem={tableItem}
                    index={originalPosition}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, (tableItem as any).stackId || `temp-${originalPosition}`)}
                    onFinalizeStack={onFinalizeStack}
                    onCancelStack={onCancelStack}
                    onStagingAccept={onStagingAccept}
                    onStagingReject={handleStagingRejectWithLocalState}
                    isDragging={isDragging}
                    onDragStart={handleTableCardDragStartWithPosition}
                    onDragEnd={handleTableCardDragEndWithPosition}
                  />
                );
              }

              return null;
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B5E20', // Main board color
    padding: 10,
  },
  tableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20, // Less padding to center cards better
  },
  emptyTable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    minWidth: 200,
  },
  cardsContainer: {
    flex: 1,
    minHeight: 180,
    flexDirection: 'row',
    justifyContent: 'center', // Center cards in each row
    alignItems: 'center',
    paddingHorizontal: 5,
    flexWrap: 'wrap', // Allows cards to wrap to new row
    gap: 30, // Smaller gap to fit 5 cards naturally on mobile screens
    alignSelf: 'center', // Center the container itself
    overflow: 'visible', // Allow dragged cards to visually escape container bounds
  },
  looseCardContainer: {
    margin: 4, // 4px margin on all sides for loose cards
  },
  stagingStackContainer: {
    position: 'relative', // Container for overlay positioning
    alignItems: 'center',
    justifyContent: 'center'
  },
});

export default TableCards;
