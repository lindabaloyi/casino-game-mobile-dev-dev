/**
 * PlayerHandArea
 * Fanned row of draggable hand cards with overlapping for compact display.
 *
 * Responsibilities:
 *  - Renders DraggableHandCard for each card in the player's hand
 *  - Cards fan out horizontally with overlap (25-30%)
 *  - Passes dropBounds, findCardAtPoint + callbacks down to each card
 *  - Threads drag-overlay callbacks so GameBoard can render the ghost
 *  - Shows action strip (Accept/Cancel) when there's a pending stack
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem } from '../table/types';
import { OpponentDragState } from '../../hooks/useGameState';
import { StackActionStrip } from '../table/StackActionStrip';

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
  // ── Stack action callbacks ────────────────────────────────────────────────
  /** Stack ID for pending action (temp/build/extend) */
  activeStackId?: string | null;
  /** Type of the active stack */
  activeStackType?: 'temp_stack' | 'build_stack' | 'extend_build' | null;
  /** Accept callback for the active stack */
  onAcceptStack?: (stackId: string) => void;
  /** Cancel callback for the active stack */
  onCancelStack?: (stackId: string) => void;
  /** Show end turn button (after steal) */
  showEndTurnButton?: boolean;
  /** End turn callback */
  onEndTurn?: () => void;
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
  activeStackId,
  activeStackType,
  onAcceptStack,
  onCancelStack,
  showEndTurnButton,
  onEndTurn,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive card dimensions based on screen width
  // Show only top half of card (half height for container)
  // Always use standard DEFAULT dimensions - no conditional scaling
  const { cardOverlap, handWidth, containerHeight, responsiveCardWidth, responsiveCardHeight, centerOffset } = useMemo(() => {
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
        containerHeight: halfHeight + 8,
        responsiveCardWidth: responsiveCw,
        responsiveCardHeight: responsiveCh,
        centerOffset: 0
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
    // Calculate centering offset - how much to indent from left to center
    const offset = Math.max(0, (screenWidth - calculatedWidth - 32) / 2);
    
    return { 
      cardOverlap: overlap, 
      handWidth: calculatedWidth,
      containerHeight: halfHeight + 8,
      responsiveCardWidth: responsiveCw,
      responsiveCardHeight: responsiveCh,
      centerOffset: offset
    };
  }, [hand.length, screenWidth]);

  return (
    <View style={[styles.container, { height: containerHeight, paddingLeft: centerOffset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.cardRow}
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
      
      {/* Action strip for pending stack - positioned on the right side */}
      {activeStackId && activeStackType && onAcceptStack && onCancelStack && (
        <View style={styles.actionStripContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => onAcceptStack(activeStackId)}
              accessibilityLabel={activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
            >
              <Text style={styles.actionButtonText}>
                {activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => onCancelStack(activeStackId)}
              accessibilityLabel="Cancel"
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* End Turn button - shown after steal */}
      {showEndTurnButton && onEndTurn && (
        <View style={styles.endTurnContainer}>
          <TouchableOpacity
            style={styles.endTurnButton}
            onPress={onEndTurn}
            accessibilityLabel="End Turn"
          >
            <Text style={styles.endTurnText}>➜ End Turn</Text>
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'center',
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
  actionStripContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    borderColor: '#d32f2f',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  endTurnContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endTurnButton: {
    backgroundColor: '#0288D1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#03A9F4',
  },
  endTurnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlayerHandArea;
