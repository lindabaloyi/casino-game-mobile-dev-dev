/**
 * TableArea — orchestrator
 *
 * Renders the table drop zone and delegates all sub-concerns to dedicated
 * components. This file intentionally contains NO styles beyond the outer
 * container — every inner visual is owned by its sub-component.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CardBounds, TempStackBounds, CapturedCardBounds, CapturePileBounds } from '../../hooks/useDrag';
import { Card, TempStack, BuildStack, TableItem, isLooseCard, isTempStack, isBuildStack } from './types';
import { DraggableLooseCard } from './DraggableLooseCard';
import { TempStackView } from './TempStackView';
import { BuildStackView } from './BuildStackView';
import { StackActionStrip } from './StackActionStrip';
import { CapturedCardsView } from './CapturedCardsView';
import { OpponentDragState } from '../../hooks/useGameState';

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
  onTableDragStart: (card: Card) => void;
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
  onCapturedCardDragStart?: (card: Card) => void;
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

// ── Type guard for stacks ───────────────────────────────────────────────

// Helper to check if an item is any stack (temp_stack or build_stack)
function isAnyStack(item: TableItem): item is TempStack | BuildStack {
  return isTempStack(item) || isBuildStack(item);
}

// Helper to check if an item is a temp stack (for overlay)
function isTempStackForOverlay(item: TableItem): item is TempStack {
  return isTempStack(item);
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
  onTableCardDropOnTemp,
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
  playerHand,
  opponentDrag,
}: Props) {
  const looseCards = tableCards.filter(isLooseCard) as Card[];
  // Show both temp stacks and build stacks
  const stacks = tableCards.filter(isAnyStack) as (TempStack | BuildStack)[];
  // Separate temp stacks and build stacks
  const tempStacks = tableCards.filter(isTempStackForOverlay) as TempStack[];
  const buildStacks = tableCards.filter(isBuildStack) as BuildStack[];

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

      {/* Card grid - iterate in server-provided order to maintain positions */}
      <View style={styles.cardRow}>
        {tableCards.map((item, index) => {
          // Loose card
          if (isLooseCard(item)) {
            const card = item as Card;
            const cardId = `${card.rank}${card.suit}`;
            // Hide this card if opponent is dragging it
            const isHidden = opponentDrag?.isDragging && 
                           opponentDrag.source === 'table' && 
                           opponentDrag.cardId === cardId;
            if (isHidden) {
              console.log(`[TableArea] Hiding table card ${cardId} - opponent is dragging`);
            } else if (opponentDrag?.isDragging) {
              console.log(`[TableArea] Table card ${cardId} visible, opponent dragging: ${opponentDrag.cardId} from ${opponentDrag.source}`);
            }
            return (
              <DraggableLooseCard
                key={`${card.rank}${card.suit}`}
                card={card}
                isMyTurn={isMyTurn}
                playerNumber={playerNumber}
                layoutVersion={tableVersion}
                registerCard={registerCard}
                unregisterCard={unregisterCard}
                findCardAtPoint={findCardAtPoint}
                findTempStackAtPoint={findTempStackAtPoint}
                isHidden={isHidden}
                onDropOnStack={(droppedCard, stackId, stackOwner, stackType) => {
                  onStackDrop?.(droppedCard, stackId, stackOwner, stackType);
                }}
                onDropOnCard={(droppedCard, targetCard) => {
                  onTableCardDropOnCard?.(droppedCard, targetCard);
                }}
                onDragStart={onTableDragStart}
                onDragMove={onTableDragMove}
                onDragEnd={onTableDragEnd}
              />
            );
          }
          
          // Temp stack
          if (isTempStack(item)) {
            const stack = item as TempStack;
            return (
              <TempStackView
                key={stack.stackId}
                stack={stack}
                layoutVersion={tableVersion}
                registerTempStack={registerTempStack}
                unregisterTempStack={unregisterTempStack}
                isMyTurn={isMyTurn}
                playerNumber={playerNumber}
                findCapturePileAtPoint={findCapturePileAtPoint}
                onDragStart={onTempStackDragStart}
                onDragMove={onTempStackDragMove}
                onDragEnd={onTempStackDragEnd}
                onDropToCapture={onDropToCapture}
              />
            );
          }
          
          // Build stack
          if (isBuildStack(item)) {
            const stack = item as BuildStack;
            return (
              <BuildStackView
                key={stack.stackId}
                stack={stack}
                layoutVersion={tableVersion}
                registerTempStack={registerTempStack}
                unregisterTempStack={unregisterTempStack}
              />
            );
          }
          
          return null;
        })}
      </View>

      {/* 
        Accept / Cancel strip — visible only to the owning player on their turn.
        Only shows for temp_stack type (not build_stack).
      */}
      {overlayStackId && (() => {
        const overlayStack = tempStacks.find(s => s.stackId === overlayStackId);
        if (!overlayStack) return null;
        return (
          <StackActionStrip
            stackType={overlayStack.type}
            stackId={overlayStackId}
            onAccept={onAcceptTemp}
            onCancel={onCancelTemp}
          />
        );
      })()}

      {/*
        Extension strip — visible when player has a build with pending extension.
        Shows Accept (completes extension with hand card) and Cancel buttons.
      */}
      {extendingBuildId && onAcceptExtend && onDeclineExtend && (() => {
        const extendingStack = stacks.find(s => s.stackId === extendingBuildId);
        if (!extendingStack) return null;
        return (
          <StackActionStrip
            stackType="extend_build"
            stackId={extendingBuildId}
            onAccept={onAcceptExtend}
            onCancel={onDeclineExtend}
          />
        );
      })()}

      {/* Captured cards on left/right sides */}
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
