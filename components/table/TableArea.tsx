/**
 * TableArea — orchestrator
 *
 * Renders the table drop zone and delegates all sub-concerns to dedicated
 * components. This file intentionally contains NO styles beyond the outer
 * container — every inner visual is owned by its sub-component.
 *
 * Sub-components:
 *   DraggableLooseCard  — position-registered, draggable loose card
 *   TempStackView       — fanned card stack with badge (color from stackActions config)
 *   StackActionStrip    — Accept / Cancel buttons (copy + colors from stackActions config)
 *
 * Adding a new stack type (build, extend_build):
 *   1. Add entry to constants/stackActions.ts
 *   2. Update components/table/types.ts
 *   3. Filter + render the new stack type below — TempStackView + StackActionStrip
 *      adapt automatically.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardBounds, TempStackBounds } from '../../hooks/useDrag';
import { Card, TempStack, TableItem, isLooseCard, isTempStack } from './types';
import { DraggableLooseCard } from './DraggableLooseCard';
import { TempStackView } from './TempStackView';
import { StackActionStrip } from './StackActionStrip';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tableCards:   TableItem[];
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
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => Card | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number } | null;

  // Table-card drop callbacks → GameBoard actions
  onTableCardDropOnCard: (card: Card, targetCard: Card) => void;
  onTableCardDropOnTemp: (card: Card, stackId: string)  => void;

  // Ghost overlay callbacks (shared with hand-card drags in GameBoard)
  onTableDragStart: (card: Card) => void;
  onTableDragMove:  (absoluteX: number, absoluteY: number) => void;
  onTableDragEnd:   () => void;

  // Pending-stack overlay control
  overlayStackId: string | null;
  onAcceptTemp:   (stackId: string) => void;
  onCancelTemp:   (stackId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TableArea({
  tableCards,
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
  onTableCardDropOnCard,
  onTableCardDropOnTemp,
  onTableDragStart,
  onTableDragMove,
  onTableDragEnd,
  overlayStackId,
  onAcceptTemp,
  onCancelTemp,
}: Props) {
  const looseCards     = tableCards.filter(isLooseCard) as Card[];
  const tempStacks     = tableCards.filter(isTempStack) as TempStack[];
  // layoutVersion bumps on every tableCards change, triggering re-measurement
  // in DraggableLooseCard and TempStackView so flex-reflow shifts are captured.
  const layoutVersion  = tableCards.length;

  return (
    <View
      ref={tableRef}
      style={[styles.area, isMyTurn && styles.areaActive]}
      onLayout={onTableLayout}
    >
      {/* Drop hint — shown when table is empty on player's turn */}
      {isMyTurn && tableCards.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Drop a card here to trail</Text>
        </View>
      )}

      {/* Card grid */}
      <View style={styles.cardRow}>
        {looseCards.map((card) => (
          <DraggableLooseCard
            key={`${card.rank}${card.suit}`}
            card={card}
            isMyTurn={isMyTurn}
            playerNumber={playerNumber}
            layoutVersion={layoutVersion}
            registerCard={registerCard}
            unregisterCard={unregisterCard}
            findCardAtPoint={findCardAtPoint}
            findTempStackAtPoint={findTempStackAtPoint}
            onDropOnCard={onTableCardDropOnCard}
            onDropOnTemp={onTableCardDropOnTemp}
            onDragStart={onTableDragStart}
            onDragMove={onTableDragMove}
            onDragEnd={onTableDragEnd}
          />
        ))}

        {tempStacks.map((stack) => (
          <TempStackView
            key={stack.stackId}
            stack={stack}
            layoutVersion={layoutVersion}
            registerTempStack={registerTempStack}
            unregisterTempStack={unregisterTempStack}
          />
        ))}
      </View>

      {/*
        Accept / Cancel strip — visible only to the owning player on their turn.
        stackType drives the copy + colours via constants/stackActions.ts.
      */}
      {overlayStackId && (
        <StackActionStrip
          stackType="temp_stack"
          stackId={overlayStackId}
          onAccept={onAcceptTemp}
          onCancel={onCancelTemp}
        />
      )}
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
  hintContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems:     'center',
  },
  hintText: {
    color:       '#81C784',
    fontSize:    14,
    fontStyle:   'italic',
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            50,
    justifyContent: 'center',
    alignItems:     'center',
    paddingHorizontal: 12,
  },
});

export default TableArea;
