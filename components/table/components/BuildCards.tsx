/**
 * BuildCards
 * Renders the two stacked cards (bottom and top) for a build.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PlayingCard } from '../../cards/PlayingCard';
import { Card } from '../types';
import { CARD_WIDTH, CARD_HEIGHT } from '../../../constants/cardDimensions';

interface BuildCardsProps {
  /** Bottom card (highest value, base of stack) */
  bottom: Card;
  /** Top card (most recently added) */
  top: Card;
  /** Offset between stacked cards */
  stackOffset?: number;
}

export function BuildCards({ bottom, top, stackOffset = 6 }: BuildCardsProps) {
  return (
    <>
      {/* Base card — highest value (bottom of stack) */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cardBottom: {
    position: 'absolute',
    top:  0,
    left: 0,
  },
  cardTop: {
    position:     'absolute',
    top:          6,
    left:         6,
    shadowColor:  '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius:  3,
    elevation:    4,
  },
});

export default BuildCards;
