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

  // Use interaction manager hook for drop handling
  const { handleDropOnStack } = useTableInteractionManager({
    tableCards,
    onDropOnCard: onDropOnCard || (() => false)
  });

  return (
    <View ref={tableRef} style={styles.tableContainer}>
      <View style={styles.tableArea}>
        {tableCards.length === 0 ? (
          <View style={styles.emptyTable}>
            {/* Empty table area - drop zone active */}
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {tableCards.map((tableItem, index) => {
              // Calculate z-index hierarchy: later cards stack higher
              const baseZIndex = tableCards.length - index; // Reverse index for stacking
              const dragZIndex = tableCards.length + 1000; // Always higher than any base z-index

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
                    onStagingReject={onStagingReject}
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
