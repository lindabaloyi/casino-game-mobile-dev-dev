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

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  hand: Card[];
  isMyTurn: boolean;
  dropBounds: MutableRefObject<DropBounds>;
  /** Find a specific table card under the finger — from useDrag */
  findCardAtPoint: (x: number, y: number) => Card | null;
  /** Find a stack at point — from useDrag */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number } | null;
  /** Check if near any table card (proximity prevention) */
  isNearAnyCard?: (x: number, y: number) => boolean;
  /** Check if near any temp stack (proximity prevention) */
  isNearAnyStack?: (x: number, y: number) => boolean;
  onTrail: (card: Card) => void;
  /** Called when the dragged card lands on a specific table card */
  onCardDrop: (handCard: Card, targetCard: Card) => void;
  /** Drag overlay callbacks — forwarded straight to each DraggableHandCard */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
  /** Capture callback */
  onCapture: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;
}

export function PlayerHandArea({
  hand,
  isMyTurn,
  dropBounds,
  findCardAtPoint,
  findTempStackAtPoint,
  isNearAnyCard,
  isNearAnyStack,
  onTrail,
  onCardDrop,
  onDragStart,
  onDragMove,
  onDragEnd,
  onCapture,
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
            isNearAnyCard={isNearAnyCard}
            isNearAnyStack={isNearAnyStack}
            isMyTurn={isMyTurn}
            onTrail={onTrail}
            onCardDrop={onCardDrop}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onCapture={onCapture}
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
