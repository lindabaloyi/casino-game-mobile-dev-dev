/**
 * TableArea
 * The central drop zone where trailed cards accumulate.
 *
 * Responsibilities:
 *  - Displays cards currently on the table, centred
 *  - Shows a dashed border + drop hint when it's the player's turn
 *  - Exposes a ref + onLayout for drop-zone measurement (used by useDrag)
 */

import React, { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  tableCards: Card[];
  isMyTurn: boolean;
  tableRef: RefObject<View | null>;
  onTableLayout: () => void;
}

export function TableArea({ tableCards, isMyTurn, tableRef, onTableLayout }: Props) {
  return (
    <View
      ref={tableRef}
      style={[styles.area, isMyTurn && styles.areaActive]}
      onLayout={onTableLayout}
    >
      {/* Drop hint — only when it's your turn and table is empty */}
      {isMyTurn && tableCards.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Drop a card here to trail</Text>
        </View>
      )}

      {/* Table cards — centred */}
      <View style={styles.cardRow}>
        {tableCards.map((card, i) => (
          <PlayingCard
            key={`${card.rank}${card.suit}-${i}`}
            rank={card.rank}
            suit={card.suit}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaActive: {
    borderColor: '#66BB6A',
    borderStyle: 'dashed',
  },
  hintContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#81C784',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TableArea;
