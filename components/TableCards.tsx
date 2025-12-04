import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Card, TableCard } from '../multiplayer/server/game-logic/game-state';
import { CardType } from './card';
import CardStack from './CardStack';
import StagingOverlay from './StagingOverlay';

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

  const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
    // Parse stack ID to get target information
    const parts = stackId.split('-');
    const targetType = parts[0]; // 'loose', 'build', or 'temp'
    const targetIndex = parseInt(parts[1]);

    if (targetType === 'loose') {
      // Dropped on a loose card
      const targetCard = tableCards[targetIndex];

      if (targetCard && getCardType(targetCard) === 'loose') {
        const looseCard = targetCard as Card; // Type assertion for loose card
        // Check if this is a table-to-table drop
        if (draggedItem.source === 'table') {
          console.log(`🎯 Table-to-table drop: ${draggedItem.card.rank}${draggedItem.card.suit} → ${looseCard.rank}${looseCard.suit}`);

          // For table-to-table drops, mark as handled but requiring server validation
          // This ensures the drop is handled (no snap-back) but goes through determineActions
          console.log(`🎯 [TableDrop:DEBUG] Table zone detected - marking for server validation`);

          return {
            tableZoneDetected: true,
            targetType: 'loose',
            targetCard: looseCard,
            draggedItem
          };
        } else {
          // Normal hand-to-table drop
          return onDropOnCard?.(draggedItem, {
            type: 'loose',
            card: looseCard,
            index: targetIndex
          }) || false;
        }
      }
    } else if (targetType === 'build') {
      // Dropped on a build
      const targetBuild = tableCards[targetIndex];
      if (targetBuild && getCardType(targetBuild) === 'build') {
        return onDropOnCard?.(draggedItem, {
          type: 'build',
          build: targetBuild,
          index: targetIndex
        }) || false;
      }
    } else if (targetType === 'temp') {
      // Dropped on a temporary stack
      const targetStack = tableCards[targetIndex];
      if (targetStack && getCardType(targetStack) === 'temporary_stack') {
        const tempStack = targetStack as any; // Type assertion for temp stack
        return onDropOnCard?.(draggedItem, {
          type: 'temporary_stack',
          stack: tempStack,
          stackId: tempStack.stackId,
          index: targetIndex
        }) || false;
      }
    }

    return false;
  }, [tableCards, onDropOnCard]);

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
              console.log(`[TableCards:DEBUG] 📚 Z-Index hierarchy for index ${index}: baseZIndex=${baseZIndex}, totalCards=${tableCards.length}, dragZIndex=${dragZIndex}`);

              // Handle different table item types using union type helper
              const itemType = getCardType(tableItem);
              if (itemType === 'loose') {
                // Loose card - use CardStack for drop zone
                const looseCard = tableItem as Card; // Type assertion for loose card
                const stackId = `loose-${index}`;

                // Get card bounds for contact validation (store globally for drop validation)
                const cardBounds = {
                  stackId,
                  index,
                  // These will be calculated by CardStack measurement
                  bounds: null as any
                };

                // Store card bounds globally for contact validation
                if (!(global as any).cardBounds) {
                  (global as any).cardBounds = {};
                }
                (global as any).cardBounds[stackId] = cardBounds;

                return (
                  <CardStack
                    key={`table-card-${index}-${looseCard.rank}-${looseCard.suit}`}
                    stackId={stackId}
                    cards={[looseCard as CardType]}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    isBuild={false}
                    currentPlayer={currentPlayer}
                    draggable={true}
                    onDragStart={onTableCardDragStart}
                    onDragEnd={onTableCardDragEnd}
                    dragSource="table"
                    style={{ zIndex: baseZIndex }}
                    dragZIndex={dragZIndex}
                  />
                );
              } else if (itemType === 'build') {
                // Build - use CardStack with build indicators
                const buildItem = tableItem as any; // Type assertion for build
                const stackId = `build-${index}`;
                const buildCards = buildItem.cards || [tableItem as CardType];
                return (
                  <CardStack
                    key={`table-build-${index}`}
                    stackId={stackId}
                    cards={buildCards}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    buildValue={buildItem.value}
                    isBuild={true}
                    currentPlayer={currentPlayer}
                    style={{ zIndex: baseZIndex }}
                  />
                );
              } else if (itemType === 'temporary_stack') {
                // Temporary stack - use CardStack with StagingOverlay for controls
                const tempStackItem = tableItem as any; // Type assertion for temp stack
                const stackId = tempStackItem.stackId || `temp-${index}`;
                const tempStackCards = tempStackItem.cards || [];
                const isCurrentPlayerOwner = tempStackItem.owner === currentPlayer;

                console.log(`[TableCards] Rendering temp stack:`, {
                  stackId: tempStackItem.stackId || stackId,
                  owner: tempStackItem.owner,
                  currentPlayer,
                  isCurrentPlayerOwner,
                  cardCount: tempStackCards.length,
                  captureValue: tempStackItem.captureValue,  // Show the value to capture with
                  cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}`)
                });

                return (
                  <View key={`staging-container-${index}`} style={styles.stagingStackContainer}>
                    <CardStack
                      stackId={tempStackItem.stackId || stackId}
                      cards={tempStackCards}
                      onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                      isBuild={false}
                      currentPlayer={currentPlayer}
                      isTemporaryStack={true}
                      stackOwner={tempStackItem.owner}
                      captureValue={tempStackItem.captureValue}  // Show the value to capture with
                      onFinalizeStack={onFinalizeStack}
                      onCancelStack={onCancelStack}
                      style={{ zIndex: baseZIndex }}
                      dragZIndex={dragZIndex}
                    />
                    {/* Show staging overlay only for player's own temporary stacks */}
                    {isCurrentPlayerOwner && (
                      <StagingOverlay
                        isVisible={true}
                        stackId={tempStackItem.stackId || stackId}
                        onAccept={() => {
                          console.log(`[TableCards] Staging accept pressed for ${stackId}`);
                          onStagingAccept?.(stackId);
                        }}
                        onReject={() => {
                          console.log(`[TableCards] Staging reject pressed for ${stackId}`);
                          onStagingReject?.(stackId);
                        }}
                      />
                    )}
                  </View>
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
