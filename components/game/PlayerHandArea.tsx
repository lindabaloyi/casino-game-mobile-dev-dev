/**
 * PlayerHandArea
 * Fanned row of draggable hand cards with overlapping for compact display.
 *
 * Responsibilities:
 *  - Renders DraggableHandCard for each card in the player's hand
 *  - Cards fan out horizontally with overlap (25-30%)
 *  - Passes dropBounds, findCardAtPoint + callbacks down to each card
 *  - Threads drag-overlay callbacks so GameBoard can render the ghost
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem } from '../table/types';
import { OpponentDragState } from '../../hooks/useGameState';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  hand: Card[];
  isMyTurn: boolean;
  playerNumber: number;
  dropBounds: React.MutableRefObject<DropBounds>;
  /** Find a specific table card under the finger — from useDrag */
  findCardAtPoint: (x: number, y: number) => { id: string; card: Card } | null;
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
  /** Opponent's drag state - for hiding cards when opponent is dragging */
  opponentDrag?: OpponentDragState | null;
}

// Card dimensions
const CARD_WIDTH = 56;
const CARD_HEIGHT = 84;
const CARD_OVERLAP_PERCENT = 0.3; // 30% overlap

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
  opponentDrag,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate overlap based on screen width and number of cards
  const { cardOverlap, handWidth } = useMemo(() => {
    const numCards = hand.length;
    if (numCards <= 1) {
      return { cardOverlap: 0, handWidth: CARD_WIDTH + 16 };
    }
    
    // Calculate how much space we have
    const availableWidth = screenWidth - 32; // Account for padding
    const idealOverlap = CARD_WIDTH * CARD_OVERLAP_PERCENT;
    const idealHandWidth = CARD_WIDTH + (numCards - 1) * (CARD_WIDTH - idealOverlap);
    
    // If ideal width fits, use it; otherwise reduce overlap
    let overlap = idealOverlap;
    if (idealHandWidth > availableWidth) {
      // Calculate minimum overlap to fit
      overlap = Math.max(0, CARD_WIDTH - (availableWidth - CARD_WIDTH) / (numCards - 1));
    }
    
    const calculatedWidth = CARD_WIDTH + (numCards - 1) * (CARD_WIDTH - overlap);
    return { cardOverlap: overlap, handWidth: calculatedWidth };
  }, [hand.length, screenWidth]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[
          styles.cardRow,
          { width: handWidth + 32 }
        ]}
        scrollEnabled={!isMyTurn}
      >
        {hand.map((card, index) => {
          const cardId = `${card.rank}${card.suit}`;
          // Hide this card if opponent is dragging it
          const isHidden = opponentDrag?.isDragging &&
                         opponentDrag.source === 'hand' &&
                         opponentDrag.cardId === cardId;
          
          return (
            <View
              key={cardId}
              style={[
                styles.cardWrapper,
                { 
                  marginRight: index === hand.length - 1 ? 0 : -cardOverlap,
                  zIndex: index + 1
                }
              ]}
            >
              <DraggableHandCard
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
                isHidden={isHidden}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + 16,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#388E3C',
  },
  scroll: {
    overflow: 'visible',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
});

export default PlayerHandArea;
