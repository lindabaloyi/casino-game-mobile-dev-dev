import React, { useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Card, TableCard } from '../multiplayer/server/game-logic/game-state';
import { BuildCardRenderer } from './table/BuildCardRenderer';
import { LooseCardRenderer } from './table/LooseCardRenderer';
import { useTableInteractionManager } from './table/TableInteractionManager';
import { TempStackRenderer } from './table/TempStackRenderer';

const { width: screenWidth } = Dimensions.get('window');

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
}

// Helper function to get card type from union types
function getCardType(card: TableCard): 'loose' | 'temporary_stack' | 'build' {
  if ('type' in card) return card.type;
  return 'loose';  // Card objects are implicitly loose cards without type property
}

// Store last drop position for contact validation
let lastDropPosition = null;

const TableCards: React.FC<TableCardsProps> = ({
  tableCards = [],
  onDropOnCard,
  currentPlayer,
  onFinalizeStack,
  onCancelStack,
  onTableCardDragStart,
  onTableCardDragEnd,
  onStagingAccept,
  onStagingReject
}) => {
  const tableRef = useRef<View>(null);

  // Use table interaction manager for drop handling
  const { handleDropOnStack } = useTableInteractionManager({
    tableCards,
    onDropOnCard: onDropOnCard || (() => false)
  });

  // Track locally cancelled staging stacks for immediate UI updates
  const [cancelledStacks, setCancelledStacks] = React.useState<Set<string>>(new Set());

  // Enhanced staging reject handler that marks stacks as cancelled locally
  const handleStagingRejectWithLocalState = React.useCallback((stackId: string) => {
    console.log(`[TableCards] ❌ CANCEL STAGING - STARTING LOCAL CANCEL PROCESS:`, {
      stackId,
      action: 'immediate-ui-hide',
      currentCancelledCount: cancelledStacks.size,
      willAddToCancelled: true,
      timestamp: Date.now()
    });

    // Mark this stack as cancelled locally for immediate UI update
    setCancelledStacks(prev => {
      const newSet = new Set([...prev, stackId]);
      console.log(`[TableCards] ✅ CANCEL STAGING - LOCAL STATE UPDATED:`, {
        stackId,
        previousCount: prev.size,
        newCount: newSet.size,
        cancelledStacksArray: Array.from(newSet),
        willTriggerReRender: true,
        visualEffect: 'temp-stack-will-disappear'
      });
      return newSet;
    });

    // Call the original handler (which is purely client-side)
    console.log(`[TableCards] 🎯 CANCEL STAGING - CALLING ORIGINAL HANDLER:`, {
      stackId,
      hasOriginalHandler: !!onStagingReject,
      handlerType: 'onStagingReject'
    });
    onStagingReject?.(stackId);

    console.log(`[TableCards] ✅ CANCEL STAGING - PROCESS COMPLETE:`, {
      stackId,
      expectedOutcome: 'temp-stack-disappears-immediately',
      playerCanRetry: true,
      serverWillEventuallySync: true
    });
  }, [cancelledStacks, onStagingReject]);

  // Expand cancelled staging stacks into loose cards for immediate visual feedback
  const visibleTableCards = React.useMemo(() => {
    console.log(`[TableCards] 🔄 CALCULATING VISIBLE TABLE CARDS:`, {
      totalTableCards: tableCards.length,
      cancelledStacksCount: cancelledStacks.size,
      cancelledStacksArray: Array.from(cancelledStacks),
      willExpandCancelledStacks: cancelledStacks.size > 0,
      timestamp: Date.now()
    });

    // First, expand cancelled temp stacks into their constituent loose cards
    const expandedCards = tableCards.flatMap(tableItem => {
      const itemType = getCardType(tableItem);
      if (itemType === 'temporary_stack') {
        const stackId = (tableItem as any).stackId;
        const isCancelled = cancelledStacks.has(stackId);
        if (isCancelled) {
          // Replace cancelled temp stack with its loose cards
          const stackCards = (tableItem as any).cards || [];
          console.log(`[TableCards] 🎯 EXPANDING CANCELLED STAGING STACK:`, {
            stackId,
            reason: 'locally-cancelled',
            visualEffect: 'cards-appear-as-loose',
            stackCardsCount: stackCards.length,
            expandedCards: stackCards.map((c: any) => `${c.rank}${c.suit}`),
            willReplaceStackWithCards: true
          });
          return stackCards; // Return the individual cards
        }
      }
      return [tableItem]; // Keep other items as-is
    });

    // Then, filter out any remaining cancelled temp stacks (should be none after expansion)
    const filtered = expandedCards.filter(tableItem => {
      const itemType = getCardType(tableItem);
      if (itemType === 'temporary_stack') {
        const stackId = (tableItem as any).stackId;
        const isCancelled = cancelledStacks.has(stackId);
        if (isCancelled) {
          console.log(`[TableCards] ⚠️ UNEXPECTED CANCELLED STACK IN FILTER:`, {
            stackId,
            reason: 'should-have-been-expanded',
            willFilterOut: true
          });
        }
        return !isCancelled;
      }
      return true;
    });

    console.log(`[TableCards] ✅ VISIBLE TABLE CARDS CALCULATED:`, {
      originalCount: tableCards.length,
      expandedCount: expandedCards.length,
      visibleCount: filtered.length,
      cancelledStacksExpanded: cancelledStacks.size,
      hasTempStacks: filtered.some(item => getCardType(item) === 'temporary_stack'),
      hasCancelledStacks: cancelledStacks.size > 0,
      willTriggerReRender: true,
      cardsRestored: expandedCards.length - tableCards.length
    });

    return filtered;
  }, [tableCards, cancelledStacks]);

  return (
    <View ref={tableRef} style={styles.tableContainer}>
      <View style={styles.tableArea}>
        {visibleTableCards.length === 0 ? (
          <View style={styles.emptyTable}>
            {/* Empty table area - drop zone active */}
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {visibleTableCards.map((tableItem, index) => {
              // Calculate z-index hierarchy: later cards stack higher
              const baseZIndex = tableCards.length - index; // Reverse index for stacking
              const dragZIndex = 99999; // Extreme z-index to ensure dragged cards always appear above everything

              console.log(`[TableCards] 🎯 RENDERING CARD ${index}:`, {
                card: getCardType(tableItem) === 'loose' ? `${(tableItem as any).rank}${(tableItem as any).suit}` : 'stack',
                type: getCardType(tableItem),
                baseZIndex,
                dragZIndex,
                willFloatAboveAll: dragZIndex === 99999,
                stackingHierarchy: 'dragged > static'
              });

              // Handle different table item types using renderer components
              const itemType = getCardType(tableItem);

              if (itemType === 'loose') {
                return (
                  <LooseCardRenderer
                    key={`table-card-${index}-${(tableItem as Card).rank}-${(tableItem as Card).suit}`}
                    tableItem={tableItem}
                    index={index}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, `loose-${index}`) as boolean}
                    onTableCardDragStart={onTableCardDragStart}
                    onTableCardDragEnd={onTableCardDragEnd}
                  />
                );
              } else if (itemType === 'build') {
                return (
                  <BuildCardRenderer
                    key={`table-build-${index}`}
                    tableItem={tableItem}
                    index={index}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, `build-${index}`) as boolean}
                  />
                );
              } else if (itemType === 'temporary_stack') {
                return (
                  <TempStackRenderer
                    key={`staging-container-${index}`}
                    tableItem={tableItem}
                    index={index}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, (tableItem as any).stackId || `temp-${index}`) as boolean}
                    onFinalizeStack={onFinalizeStack}
                    onCancelStack={onCancelStack}
                    onStagingAccept={onStagingAccept}
                    onStagingReject={handleStagingRejectWithLocalState}
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
