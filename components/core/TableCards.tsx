import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Card,
  TableCard,
} from "../../multiplayer/server/game-logic/game-state";
import { BuildCardRenderer } from "../table/BuildCardRenderer";
import TableDraggableCard from "../table/TableDraggableCard";
import { useTableInteractionManager } from "../table/TableInteractionManager";
import { TempStackRenderer } from "../table/TempStackRenderer";

interface TableCardsProps {
  tableCards?: TableCard[];
  onDropOnCard?: (draggedItem: any, targetInfo: any) => boolean;
  currentPlayer: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onTableCardDragStart?: (card: any) => void;
  onTableCardDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onTempAccept?: (tempId: string) => void;
  onTempReject?: (tempId: string) => void;
  sendAction?: (action: any) => void;
  gameState?: any;
  onAcceptBuildAddition?: (buildId: string) => void;
  onRejectBuildAddition?: () => void;
  onAcceptBuildExtension?: (buildId: string) => void;
  onCancelBuildExtension?: (buildId: string) => void;
  onMergeBuildExtension?: () => void;
}

function getCardType(
  card: TableCard,
):
  | "loose"
  | "temporary_stack"
  | "build"
  | "game-over-point-card"
  | "game-over-bonus"
  | "game-over-separator" {
  if ("type" in card) return card.type;
  return "loose";
}

const TableCards: React.FC<TableCardsProps> = ({
  tableCards = [],
  onDropOnCard,
  currentPlayer,
  onFinalizeStack,
  onCancelStack,
  onTableCardDragStart,
  onTableCardDragEnd,
  onTempAccept,
  onTempReject,
  sendAction,
  gameState,
  onAcceptBuildAddition,
  onRejectBuildAddition,
  onAcceptBuildExtension,
  onCancelBuildExtension,
  onMergeBuildExtension,
}) => {
  const tableRef = useRef<View>(null);
  const tableBoundsRef = useRef<any>(null);

  const [isDragging, setIsDragging] = React.useState(false);

  const handleTableCardDragStartWithPosition = React.useCallback(
    (card: any) => {
      setIsDragging(true);
      onTableCardDragStart?.(card);
    },
    [onTableCardDragStart],
  );

  const handleTableCardDragEndWithPosition = React.useCallback(
    (draggedItem: any, dropPosition: any) => {
      setIsDragging(false);
      onTableCardDragEnd?.(draggedItem, dropPosition);
    },
    [onTableCardDragEnd],
  );

  const { handleDropOnStack } = useTableInteractionManager({
    tableCards,
    onDropOnCard: onDropOnCard || (() => false),
  });

  const [cancelledStacks] = React.useState<Set<string>>(new Set());

  const handleTempRejectWithLocalState = React.useCallback(
    (tempId: string) => {
      onTempReject?.(tempId);
    },
    [onTempReject],
  );

  const visibleTableCards = React.useMemo(() => {
    const transformedCards = tableCards.flatMap((tableItem, originalIndex) => {
      if (!tableItem) {
        return [];
      }

      const itemType = getCardType(tableItem);

      if (itemType === "temporary_stack") {
        const stackId = (tableItem as any).stackId;
        const isCancelled = cancelledStacks.has(stackId);

        if (isCancelled) {
          const stackCards = (tableItem as any).cards || [];
          if (stackCards.length === 0) {
            return [];
          }

          return stackCards.map((card: any, cardIndex: number) => ({
            ...card,
            _cancelledStackId: stackId,
            _pos: originalIndex,
            _inStackIdx: cardIndex,
          }));
        }

        return [tableItem];
      }

      return [tableItem];
    });

    return transformedCards;
  }, [tableCards, cancelledStacks]);

  return (
    <View
      ref={tableRef}
      style={styles.tableContainer}
      onLayout={() => {
        tableRef.current?.measureInWindow((x, y, width, height) => {
          tableBoundsRef.current = { x, y, width, height };
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
              const originalPosition =
                (tableItem as any)._pos !== undefined
                  ? (tableItem as any)._pos
                  : visibleIndex;

              const baseZIndex = visibleIndex + 1;
              const dragZIndex = 100000;
              const itemType = getCardType(tableItem);

              if (itemType === "loose") {
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
              } else if (itemType === "build") {
                const buildId = (tableItem as any).buildId;
                const hasPendingAddition =
                  gameState?.pendingBuildAdditions?.[buildId];

                return (
                  <BuildCardRenderer
                    key={`table-build-${originalPosition}`}
                    tableItem={tableItem}
                    index={originalPosition}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    sendAction={sendAction}
                    showOverlay={!!hasPendingAddition}
                    onAcceptBuildAddition={onAcceptBuildAddition}
                    onRejectBuildAddition={onRejectBuildAddition}
                    onAcceptBuildExtension={onAcceptBuildExtension}
                    onCancelBuildExtension={onCancelBuildExtension}
                    onMergeBuildExtension={onMergeBuildExtension}
                  />
                );
              } else if (itemType === "temporary_stack") {
                return (
                  <TempStackRenderer
                    key={`temp-container-${originalPosition}`}
                    tableItem={tableItem}
                    index={originalPosition}
                    baseZIndex={baseZIndex}
                    dragZIndex={dragZIndex}
                    currentPlayer={currentPlayer}
                    onDropStack={(draggedItem) =>
                      handleDropOnStack(
                        draggedItem,
                        (tableItem as any).stackId ||
                          `temp-${originalPosition}`,
                      )
                    }
                    onFinalizeStack={onFinalizeStack}
                    onCancelStack={onCancelStack}
                    onTempAccept={onTempAccept}
                    onTempReject={handleTempRejectWithLocalState}
                    isDragging={isDragging}
                    onDragStart={handleTableCardDragStartWithPosition}
                    onDragEnd={handleTableCardDragEndWithPosition}
                  />
                );
              } else if (itemType === "game-over-point-card") {
                // Render individual point cards (10♦, 2♠, Aces)
                return (
                  <GameOverPointCard
                    key={`game-over-point-${originalPosition}`}
                    card={tableItem}
                    index={originalPosition}
                  />
                );
              } else if (itemType === "game-over-bonus") {
                // Render bonus cards (*21 cards, spades count)
                return (
                  <GameOverBonusCard
                    key={`game-over-bonus-${originalPosition}`}
                    bonusCard={tableItem}
                    index={originalPosition}
                  />
                );
              } else if (itemType === "game-over-separator") {
                // Render player separators
                return (
                  <GameOverSeparator
                    key={`game-over-separator-${originalPosition}`}
                    separator={tableItem}
                    index={originalPosition}
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B5E20",
    padding: 10,
  },
  tableArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
  emptyTable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 100,
    minWidth: 200,
  },
  cardsContainer: {
    flex: 1,
    minHeight: 180,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    flexWrap: "wrap",
    gap: 30,
    alignSelf: "center",
    overflow: "visible",
  },
  looseCardContainer: {
    margin: 4,
  },
  stagingStackContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  gameOverPointCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    margin: 4,
    minWidth: 80,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameOverCardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  gameOverCardPoints: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  gameOverBonusCard: {
    backgroundColor: "#FFD700",
    borderRadius: 8,
    padding: 12,
    margin: 4,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameOverBonusText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 4,
  },
  gameOverBonusPoints: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "bold",
  },
  gameOverSeparator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gameOverSeparatorText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});

// Game Over Components
const GameOverPointCard: React.FC<{ card: any; index: number }> = ({
  card,
  index,
}) => {
  return (
    <View style={styles.gameOverPointCard}>
      <Text style={styles.gameOverCardText}>
        {card.rank}
        {card.suit}
      </Text>
      <Text style={styles.gameOverCardPoints}>+{card.pointValue}</Text>
    </View>
  );
};

const GameOverBonusCard: React.FC<{ bonusCard: any; index: number }> = ({
  bonusCard,
  index,
}) => {
  return (
    <View style={styles.gameOverBonusCard}>
      <Text style={styles.gameOverBonusText}>{bonusCard.description}</Text>
      <Text style={styles.gameOverBonusPoints}>+{bonusCard.points}</Text>
    </View>
  );
};

const GameOverSeparator: React.FC<{ separator: any; index: number }> = ({
  separator,
  index,
}) => {
  return (
    <View style={styles.gameOverSeparator}>
      <Text style={styles.gameOverSeparatorText}>{separator.separator}</Text>
    </View>
  );
};

export default TableCards;
