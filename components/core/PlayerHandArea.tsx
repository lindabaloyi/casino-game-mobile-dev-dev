/**
 * PlayerHandArea
 * Scrollable row of draggable hand cards.
 *
 * Responsibilities:
 *  - Renders DraggableHandCard for each card in the player's hand
 *  - Passes dropBounds, findCardAtPoint + callbacks down to each card
 *  - Threads drag-overlay callbacks so GameBoard can render the ghost
 */

import React, { MutableRefObject } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem } from '../table/types';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  hand: Card[];
  isMyTurn: boolean;
  playerNumber: number;
  dropBounds: MutableRefObject<DropBounds>;
  /** Find a specific table card under the finger — from useDrag */
  findCardAtPoint: (x: number, y: number) => Card | null;
  /** Find a stack at point — from useDrag */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  /** Table cards - needed for game logic */
  tableCards?: TableItem[];
  // ── DUMB callbacks - just report what was hit ────────────────────────────
  /** Called when dropped on a stack - SmartRouter decides what action */
  onDropOnStack: (card: Card, stackId: string, owner: number, stackType: 'temp_stack' | 'build_stack') => void;
  /** Called when dropped on a specific card - SmartRouter decides what action */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  /** Called when dropped on table zone - SmartRouter decides trail vs other */
  onDropOnTable: (card: Card) => void;
  // ── Legacy callbacks (for compatibility) ───────────────────────────────────
  onDragStart?: (card: Card) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
}

export function PlayerHandArea({
  hand,
  isMyTurn,
  playerNumber,
  dropBounds,
  findCardAtPoint,
  findTempStackAtPoint,
  tableCards,
  onDropOnStack,
  onDropOnCard,
  onDropOnTable,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.cardRow}
        scrollEnabled={!isMyTurn}   // prevent accidental scroll during drag turn
      >
        {hand.map((card) => (
          <DraggableHandCard
            key={`${card.rank}${card.suit}`}
            card={card}
            dropBounds={dropBounds}
            findCardAtPoint={findCardAtPoint}
            findTempStackAtPoint={findTempStackAtPoint}
            isMyTurn={isMyTurn}
            playerNumber={playerNumber}
            playerHand={hand}
            tableCards={tableCards}
            onDropOnStack={onDropOnStack}
            onDropOnCard={onDropOnCard}
            onDropOnTable={onDropOnTable}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 65,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#388E3C',
  },
  scroll: {
    overflow: 'visible',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});

export default PlayerHandArea;
