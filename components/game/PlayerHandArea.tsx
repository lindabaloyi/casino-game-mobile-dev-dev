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

import React, { useMemo, useRef, useCallback } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem } from '../table/types';
import { OpponentDragState } from '../../hooks/useGameState';
import { StackActionStrip } from '../table/StackActionStrip';
import { areTeammates } from '../../shared/game/team';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface BuildStack {
  owner: number;
  value: number;
  cards: Card[];
  cardsMap: Record<string, Card>;
  name: string;
  buildType: 'solo' | 'extendable';
  stackType: 'build';
  stackId?: string;
  /** Whether Shiya is active on this build (party mode only) */
  shiyaActive?: boolean;
}

interface Player {
  hand: Card[];
  captures: Card[];
  score: number;
  buildStacks?: BuildStack[];
}

interface GameState {
  players: Player[];
  playerCount: number;
  table: TableItem[];
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
  /** Called when dropped on a build stack */
  onDropOnBuildStack?: (card: Card, stackId: string, owner: number, source: string) => void;
  /** Called when dropped on a temp stack */
  onDropOnTempStack?: (card: Card, stackId: string, source: string) => void;
  /** Called when dropped on an existing loose card - creates temp stack attached to target */
  onDropOnLooseCard: (card: Card, targetCard: Card) => void;
  /** Called when dropped on table zone */
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
  /** Game state for Shiya qualification check */
  gameState?: GameState;
  /** Current player index */
  currentPlayer?: number;
  /** Pending drop card - for optimistic UI to hide card immediately after drop */
  pendingDropCard?: Card | null;
  /** Pending drop source - 'hand' | 'captured' | 'table' | null */
  pendingDropSource?: 'hand' | 'captured' | 'table' | null;
  /** Callback for card contact sound - passed from GameBoard to persist across drags */
  onCardContact?: () => void;
  /** Callback for trail sound - passed from GameBoard */
  onTrailSound?: () => void;
  /** Callback for button click sound - passed from GameBoard */
  onPlayButtonSound?: () => void;
  /** Double-tap callback for creating single-card temp stacks */
  onDoubleTapCard?: (card: Card) => void;
}

// Default card dimensions - matching capture pile (56x84)
const DEFAULT_CARD_WIDTH = CARD_WIDTH;  // 56
const DEFAULT_CARD_HEIGHT = CARD_HEIGHT; // 84
const CARD_OVERLAP_PERCENT = 0.3;

// Compact card dimensions (when dragging)
const COMPACT_CARD_WIDTH = CARD_WIDTH;
const COMPACT_CARD_HEIGHT = CARD_HEIGHT;

export function PlayerHandArea({
  hand,
  isMyTurn,
  playerNumber,
  dropBounds,
  findCardAtPoint,
  findTempStackAtPoint,
  tableCards,
  onDropOnBuildStack,
  onDropOnTempStack,
  onDropOnLooseCard,
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
  gameState,
  currentPlayer,
  pendingDropCard,
  pendingDropSource,
  onCardContact,
  onTrailSound,
  onPlayButtonSound,
  onDoubleTapCard,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Sort hand by card value (ascending - smallest on left, largest on right)
  const sortedHand = useMemo(() => {
    return [...hand].sort((a, b) => a.value - b.value);
  }, [hand]);
  
  // Note: Card contact sound is now passed via onCardContact prop from GameBoard
  // This ensures sounds persist across drags (PlayerHandArea remounts on drag)
  
  // Wrapper for onDropOnTable that plays trail sound
  const handleDropOnTable = useCallback((card: Card) => {
    if (onTrailSound) {
      onTrailSound();
    }
    onDropOnTable(card);
  }, [onDropOnTable, onTrailSound]);
  
  // Calculate responsive card dimensions based on screen width
  // Show only top half of card (half height for container)
  // Always use standard DEFAULT dimensions - no conditional scaling
  const { cardOverlap, handWidth, containerHeight, responsiveCardWidth, responsiveCardHeight, centerOffset, shouldCenterCards, containerPaddingHorizontal } = useMemo(() => {
    const numCards = sortedHand.length;
    
    // Always use default dimensions - no scaling based on card count
    const cw = DEFAULT_CARD_WIDTH;
    const ch = DEFAULT_CARD_HEIGHT;
    
    // Calculate responsive versions that scale with screen width
    const responsiveCw = Math.min(cw, screenWidth / 5);
    const responsiveCh = Math.min(ch, responsiveCw * (CARD_HEIGHT / CARD_WIDTH));
    // Half height for showing only top portion of card
    const halfHeight = responsiveCh * 0.5;
    
    // Calculate card width for 6 cards case
    const sixCardWidth = responsiveCw * 6;
    
    // Special case: exactly 6 cards - no fanning, side by side with no overlap
    // But still calculate centering offset to keep cards centered
    if (numCards === 6) {
      const offset = Math.max(0, (screenWidth - sixCardWidth - 32) / 2);
      return { 
        cardOverlap: 0, 
        handWidth: sixCardWidth,
        containerHeight: halfHeight + 8,
        responsiveCardWidth: responsiveCw,
        responsiveCardHeight: responsiveCh,
        centerOffset: offset,
        shouldCenterCards: false,
        containerPaddingHorizontal: 16
      };
    }
    
    if (numCards <= 1) {
      // Calculate centering offset for single card - center it on screen
      const singleCardWidth = responsiveCw + 16;
      const offset = Math.max(0, (screenWidth - singleCardWidth - 32) / 2);
      return { 
        cardOverlap: 0, 
        handWidth: singleCardWidth,
        containerHeight: halfHeight + 8,
        responsiveCardWidth: responsiveCw,
        responsiveCardHeight: responsiveCh,
        centerOffset: offset,
        shouldCenterCards: true,  // Enable centering for single card
        containerPaddingHorizontal: 16
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
    // Calculate centering offset - always use screen width, not affected by table
    const offset = Math.max(0, (screenWidth - calculatedWidth - 32) / 2);
    
    return { 
      cardOverlap: overlap, 
      handWidth: calculatedWidth,
      containerHeight: halfHeight + 8,
      responsiveCardWidth: responsiveCw,
      responsiveCardHeight: responsiveCh,
      centerOffset: offset,
      shouldCenterCards: false,
      containerPaddingHorizontal: 16
    };
  }, [sortedHand.length, screenWidth]);

  // Card row style - centered when shouldCenterCards is true (6 cards)
  const cardRowStyle = useMemo(() => {
    return [
      styles.cardRow,
      shouldCenterCards && styles.cardRowCentered
    ];
  }, [shouldCenterCards]);

  return (
    <View style={[styles.container, { height: containerHeight, paddingLeft: centerOffset, paddingRight: containerPaddingHorizontal }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={cardRowStyle}
        scrollEnabled={!isMyTurn}
      >
        {sortedHand.map((card, index) => {
          const cardId = `${card.rank}${card.suit}`;
          // Hide card if:
          // 1. Opponent is actively dragging this card, OR
          // 2. Card has been dropped (has targetId) - from opponent, OR
          // 3. LOCAL: Card is pending drop - our own drop not yet confirmed (optimistic UI)
          const isPendingDrop = pendingDropCard && 
            pendingDropSource === 'hand' &&
            pendingDropCard.rank === card.rank && 
            pendingDropCard.suit === card.suit;
          
          if (isPendingDrop) {
            console.log('[PlayerHandArea] OPTIMISTIC UI: Hiding card', card.rank, card.suit, '- pending drop confirmed');
          }
          
          const isHidden = Boolean(
            (opponentDrag?.isDragging &&
              opponentDrag.source === 'hand' &&
              opponentDrag.cardId === cardId) ||
            (opponentDrag?.targetId &&
              opponentDrag.source === 'hand' &&
              opponentDrag.cardId === cardId) ||
            isPendingDrop
          );
          
          return (
            <View
              key={cardId}
              style={{
                width: responsiveCardWidth,
                height: responsiveCardHeight,
                marginRight: index === sortedHand.length - 1 ? 0 : -cardOverlap,
                zIndex: index + 1,
                overflow: 'hidden', // Clip to show only top half
              }}
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
                  onDropOnBuildStack={onDropOnBuildStack}
                  onDropOnTempStack={onDropOnTempStack}
                  onDropOnLooseCard={onDropOnLooseCard}
                  onDropOnTable={handleDropOnTable}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                  isHidden={isHidden}
                  cardWidth={responsiveCardWidth}
                  cardHeight={responsiveCardHeight}
                  onCardContact={onCardContact}
                  onDoubleTap={onDoubleTapCard}
                />
              </View>
            );
        })}
      </ScrollView>
      
      {/* Action strip for pending stack - positioned on the right side */}
      {(activeStackId && activeStackType && onAcceptStack && onCancelStack) ? (
        <View style={styles.actionStripContainer}>
          <View style={styles.actionButtons}>
            {activeStackId && activeStackType && onAcceptStack && onCancelStack && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => {
                    if (onPlayButtonSound) onPlayButtonSound();
                    onAcceptStack && activeStackId && onAcceptStack(activeStackId);
                  }}
                  accessibilityLabel={activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
                >
                  <Text style={styles.actionButtonText}>
                    {activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    if (onPlayButtonSound) onPlayButtonSound();
                    onCancelStack && activeStackId && onCancelStack(activeStackId);
                  }}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* End Turn button - shown after steal - styled to match StackActionStrip */}
      {showEndTurnButton && onEndTurn && (
        <View style={styles.endTurnContainer}>
          <TouchableOpacity
            style={styles.endTurnButton}
            onPress={() => {
              if (onPlayButtonSound) onPlayButtonSound();
              onEndTurn();
            }}
            accessibilityLabel="End Turn"
          >
            <Text style={styles.endTurnText}>End Turn</Text>
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
  cardRowCentered: {
    justifyContent: 'center',
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
  recallButton: {
    backgroundColor: '#9C27B0',
    borderColor: '#7B1FA2',
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
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#388E3C',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endTurnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PlayerHandArea;
