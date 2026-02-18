/**
 * PlayerHandArea
 * Scrollable row of draggable hand cards.
 *
 * Responsibilities:
 *  - Renders DraggableHandCard for each card in the player's hand
 *  - Passes dropBounds + isMyTurn down to each card
 *  - Threads drag-overlay callbacks (onDragStart / onDragMove / onDragEnd)
 *    down to each card so GameBoard can render the ghost above the table
 */

import React, { MutableRefObject } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { DropBounds } from '../../hooks/useDrag';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  hand: Card[];
  isMyTurn: boolean;
  dropBounds: MutableRefObject<DropBounds>;
  onTrail: (card: Card) => void;
  /** Drag overlay callbacks — forwarded straight to each DraggableHandCard */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
}

export function PlayerHandArea({
  hand,
  isMyTurn,
  dropBounds,
  onTrail,
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
            isMyTurn={isMyTurn}
            onTrail={onTrail}
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
    paddingHorizontal: 12,
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
  },
});

export default PlayerHandArea;
