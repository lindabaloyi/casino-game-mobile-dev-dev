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

// Default card dimensions - matching table card size (56x84)
const DEFAULT_CARD_WIDTH = 56;
const DEFAULT_CARD_HEIGHT = 84;
const CARD_OVERLAP_PERCENT = 0.3;

// Compact card dimensions (when dragging)
const COMPACT_CARD_WIDTH = 56;
const COMPACT_CARD_HEIGHT = 84;

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
  
  // Calculate responsive card dimensions based on screen width
  // Show only top half of card (half height for container)
  // Always use standard DEFAULT dimensions - no conditional scaling
  const { cardOverlap, handWidth, containerHeight, responsiveCardWidth, responsiveCardHeight } = useMemo(() => {
    const numCards = hand.length;
    
    // Always use default dimensions - no scaling based on card count
    const cw = DEFAULT_CARD_WIDTH;
    const ch = DEFAULT_CARD_HEIGHT;
    
    // Calculate responsive versions that scale with screen width
    const responsiveCw = Math.min(cw, screenWidth / 7);
    const responsiveCh = Math.min(ch, responsiveCw * 1.5);
    // Half height for showing only top portion of card
    const halfHeight = responsiveCh * 0.5;
    
    if (numCards <= 1) {
      return { 
        cardOverlap: 0, 
        handWidth: responsiveCw + 16,
        containerHeight: halfHeight + 8, // Reduced container height
        responsiveCardWidth: responsiveCw,
        responsiveCardHeight: responsiveCh
      };
    }
    
    const availableWidth = screenWidth - 32;
    const idealOverlap = responsiveCw * CARD_OVERLAP_PERCENT;
    const idealHandWidth = responsiveCw + (numCards - 1) * (responsiveCw - idealOverlap);
    
    let overlap = idealOverlap;
    if (idealHandWidth > availableWidth) {
      overlap = Math.max(0, responsiveCw - (availableWidth - responsiveCw) / (numCards - 1));
    }
    
    const calculatedWidth = responsiveCw + (numCards - 1) * (responsiveCw - overlap);
    return { 
      cardOverlap: overlap, 
      handWidth: calculatedWidth,
      containerHeight: halfHeight + 8, // Reduced container height
      responsiveCardWidth: responsiveCw,
      responsiveCardHeight: responsiveCh
    };
  }, [hand.length, screenWidth]);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
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
          const isHidden = opponentDrag?.isDragging &&
                         opponentDrag.source === 'hand' &&
                         opponentDrag.cardId === cardId;
          
          return (
            <View
              key={cardId}
              style={[
                { 
                  width: responsiveCardWidth,
                  height: responsiveCardHeight,
                  marginRight: index === hand.length - 1 ? 0 : -cardOverlap,
                  zIndex: index + 1,
                  overflow: 'hidden', // Clip to show only top half
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
                cardWidth={responsiveCardWidth}
                cardHeight={responsiveCardHeight}
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
});

export default PlayerHandArea;
