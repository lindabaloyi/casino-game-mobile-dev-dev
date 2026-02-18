/**
 * PlayerHandArea
 * Scrollable row of draggable hand cards.
 * Only the top half of each card is visible (section height clips the rest).
 *
 * Responsibilities:
 *  - Renders DraggableHandCard for each card in the player's hand
 *  - Passes dropBounds + isMyTurn down to each card
 *  - Uses overflow:visible so drag animations escape the container
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
}

export function PlayerHandArea({ hand, isMyTurn, dropBounds, onTrail }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.cardRow}
      >
        {hand.map((card) => (
          <DraggableHandCard
            key={`${card.rank}${card.suit}`}
            card={card}
            dropBounds={dropBounds}
            isMyTurn={isMyTurn}
            onTrail={onTrail}
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
    overflow: 'visible',   // lets dragged cards travel above the container
  },
  scroll: {
    overflow: 'visible',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    overflow: 'visible',
    alignItems: 'flex-start',
  },
});

export default PlayerHandArea;
