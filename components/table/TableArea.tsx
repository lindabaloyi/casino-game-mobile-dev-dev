/**
 * TableArea — orchestrator
 *
 * Renders the table drop zone and delegates all sub-concerns to dedicated
 * components. This file intentionally contains NO styles beyond the outer
 * container — every inner visual is owned by its sub-component.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CardBounds, TempStackBounds, CapturedCardBounds, CapturePileBounds } from '../../hooks/useDrag';
import { Card, TempStack, BuildStack, TableItem, isLooseCard, isTempStack, isBuildStack, AnyStack } from './types';
import { CapturedCardsView } from './CapturedCardsView';
import { OpponentDragState } from '../../hooks/useGameState';

// Layout components
import { TableGrid } from './layout/TableGrid';

// Item renderer
import { TableItemRenderer } from './items/TableItemRenderer';

// Overlays
import { DropHint } from './overlays/DropHint';
import { StackOverlay } from './overlays/StackOverlay';
import { ExtensionOverlay } from './overlays/ExtensionOverlay';

// Visibility utility
import { useCardVisibility } from './utils/cardVisibility';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tableCards:   TableItem[];
  /** Version counter that increments on every table change (not just count). 
   * Used to trigger re-measure of card positions when cards shift. */
  tableVersion: number;
  isMyTurn:     boolean;
  playerNumber: number;
  tableRef:     React.RefObject<View | null>;
  onTableLayout: () => void;

  // Loose card position registry (from useDrag)
  registerCard:   (id: string, bounds: CardBounds) => void;
  unregisterCard: (id: string) => void;

  // Temp stack position registry (from useDrag)
  registerTempStack:   (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;

  // Hit detection (from useDrag, forwarded to DraggableLooseCard → DraggableTableCard)
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;

  // Stack drop handler - DUMB, just passes to GameBoard
  onStackDrop?: (card: Card, stackId: string, stackOwner: number, stackType: 'temp_stack' | 'build_stack') => void;
  // Legacy specific callbacks (kept for CapturedCardsView compatibility)
  onTableCardDropOnCard?: (card: Card, targetCard: Card) => void;
  onTableCardDropOnTemp?: (card: Card, stackId: string)  => void;

  // Ghost overlay callbacks (shared with hand-card drags in GameBoard)
  onTableDragStart: (card: Card, absoluteX: number, absoluteY: number) => void;
  onTableDragMove:  (absoluteX: number, absoluteY: number) => void;
  onTableDragEnd:   () => void;

  // Pending-stack overlay control
  overlayStackId: string | null;
  onAcceptTemp:   (stackId: string) => void;
  onCancelTemp:   (stackId: string) => void;

  // Capture callback
  onCapture: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;

  // Captured cards arrays
  playerCaptures: Card[];
  opponentCaptures: Card[];

  // Captured card callbacks (for dragging opponent's captured card)
  registerCapturedCard?: (bounds: CapturedCardBounds) => void;
  unregisterCapturedCard?: () => void;
  onCapturedCardDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onCapturedCardDragMove?: (absoluteX: number, absoluteY: number) => void;
  onCapturedCardDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string) => void;

  // Capture pile drop target
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  registerCapturePile?: (bounds: CapturePileBounds) => void;
  unregisterCapturePile?: () => void;
  /** Callback for dropping a temp stack onto capture pile */
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
  
  // Temp stack drag handlers
  onTempStackDragStart?: (stack: TempStack) => void;
  onTempStackDragMove?: (absoluteX: number, absoluteY: number) => void;
  onTempStackDragEnd?: (stack: TempStack) => void;

  // Build extension handlers
  extendingBuildId?: string | null;
  onExtendBuild?: (card: Card, buildStackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
  onAcceptExtend?: (stackId: string) => void;
  onDeclineExtend?: (stackId: string) => void;
  
  // Player hand - needed for capture vs extend logic
  playerHand?: Card[];
  
  // Opponent's drag state - for hiding cards during opponent's drag
  opponentDrag?: OpponentDragState | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TableArea({
  tableCards,
  tableVersion,
  isMyTurn,
  playerNumber,
  tableRef,
  onTableLayout,
  registerCard,
  unregisterCard,
  registerTempStack,
  unregisterTempStack,
  findCardAtPoint,
  findTempStackAtPoint,
  onStackDrop,
  onTableCardDropOnCard,
  onTableDragStart,
  onTableDragMove,
  onTableDragEnd,
  overlayStackId,
  onAcceptTemp,
  onCancelTemp,
  onCapture,
  playerCaptures,
  opponentCaptures,
  registerCapturedCard,
  unregisterCapturedCard,
  onCapturedCardDragStart,
  onCapturedCardDragMove,
  onCapturedCardDragEnd,
  findCapturePileAtPoint,
  registerCapturePile,
  unregisterCapturePile,
  onDropToCapture,
  onTempStackDragStart,
  onTempStackDragMove,
  onTempStackDragEnd,
  extendingBuildId,
  onExtendBuild,
  onAcceptExtend,
  onDeclineExtend,
  opponentDrag,
}: Props) {
  // Separate item types
  const tempStacks = tableCards.filter(isTempStack) as TempStack[];
  const stacks = tableCards.filter((item): item is AnyStack => 
    isTempStack(item) || isBuildStack(item)
  );
  const looseCards = tableCards.filter(isLooseCard) as Card[];

  console.log(`[TableArea] ===== TABLE AREA RENDER =====`);
  console.log(`[TableArea] Total tableCards: ${tableCards.length}`);
  console.log(`[TableArea] Grid items breakdown:`, {
    total: tableCards.length,
    loose: looseCards.length,
    tempStacks: tempStacks.length,
    buildStacks: tableCards.filter(isBuildStack).length,
  });

  // Visibility logic
  const { isCardHidden } = useCardVisibility(opponentDrag);

  // Helper to get a unique key for an item
  const getItemKey = (item: TableItem, index: number): string => {
    if (isLooseCard(item)) {
      return `card-${(item as Card).rank}${(item as Card).suit}`;
    }
    if (isTempStack(item)) {
      return `temp-${(item as TempStack).stackId}`;
    }
    if (isBuildStack(item)) {
      return `build-${(item as BuildStack).stackId}`;
    }
    return `item-${index}`;
  };

  // Render item function for grid
  const renderItem = (item: TableItem, index: number) => {
    // Determine if hidden for loose cards
    const hidden = isLooseCard(item) ? isCardHidden(item as Card) : false;
    
    return (
      <TableItemRenderer
        key={getItemKey(item, index)}
        item={item}
        index={index}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        tableVersion={tableVersion}
        registerCard={registerCard}
        unregisterCard={unregisterCard}
        registerTempStack={registerTempStack}
        unregisterTempStack={unregisterTempStack}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        findCapturePileAtPoint={findCapturePileAtPoint}
        onStackDrop={onStackDrop}
        onTableCardDropOnCard={onTableCardDropOnCard}
        onTableDragStart={onTableDragStart}
        onTableDragMove={onTableDragMove}
        onTableDragEnd={onTableDragEnd}
        onTempStackDragStart={onTempStackDragStart}
        onTempStackDragMove={onTempStackDragMove}
        onTempStackDragEnd={onTempStackDragEnd}
        onDropToCapture={onDropToCapture}
        isHidden={hidden}
      />
    );
  };

  return (
    <View
      ref={tableRef}
      style={[styles.area, isMyTurn && styles.areaActive]}
      onLayout={onTableLayout}
    >
      {/* Drop hint */}
      <DropHint visible={isMyTurn && tableCards.length === 0} />

      {/* Card grid */}
      <TableGrid 
        items={tableCards}
        renderItem={renderItem}
      />

      {/* Overlays */}
      <StackOverlay
        overlayStackId={overlayStackId}
        tempStacks={tempStacks}
        onAcceptTemp={onAcceptTemp}
        onCancelTemp={onCancelTemp}
      />

      <ExtensionOverlay
        extendingBuildId={extendingBuildId ?? null}
        stacks={stacks}
        onAcceptExtend={onAcceptExtend}
        onDeclineExtend={onDeclineExtend}
      />

      {/* Captured cards */}
      <CapturedCardsView
        playerCaptures={playerCaptures}
        opponentCaptures={opponentCaptures}
        playerNumber={playerNumber}
        isMyTurn={isMyTurn}
        registerCapturedCard={registerCapturedCard}
        unregisterCapturedCard={unregisterCapturedCard}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        onDragStart={onCapturedCardDragStart}
        onDragMove={onCapturedCardDragMove}
        onDragEnd={onCapturedCardDragEnd}
        registerCapturePile={registerCapturePile}
        unregisterCapturePile={unregisterCapturePile}
        onExtendBuild={onExtendBuild}
        opponentDrag={opponentDrag}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  area: {
    flex:         1,
    margin:       8,
    borderRadius: 12,
    borderWidth:  2,
    borderColor:  'transparent',
    justifyContent: 'center',
    alignItems:     'center',
    overflow:       'visible',
  },
  areaActive: {
    borderColor: '#66BB6A',
    borderStyle: 'dashed',
  },
});

export default TableArea;
