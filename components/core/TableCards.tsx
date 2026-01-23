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
  | "build" {
  if ("type" in card) return card.type;
  return "loose";
}

let tableCardsRenderCount = 0;

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
  tableCardsRenderCount++;
  console.log(`🔄 TableCards render #${tableCardsRenderCount}`, {
    time: Date.now(),
    tableCardsLength: tableCards?.length,
    currentPlayer,
    trigger: 'drag_or_prop_change'
  });
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
});



export default React.memo(TableCards, (prevProps, nextProps) => {
  // Only re-render if these specific props actually change
  const shouldUpdate =
    prevProps.tableCards !== nextProps.tableCards ||
    prevProps.currentPlayer !== nextProps.currentPlayer;

  console.log('🧠 TableCards memo check:', {
    shouldUpdate,
    prevCards: prevProps.tableCards?.length,
    nextCards: nextProps.tableCards?.length,
    prevPlayer: prevProps.currentPlayer,
    nextPlayer: nextProps.currentPlayer
  });

  return !shouldUpdate;
});
