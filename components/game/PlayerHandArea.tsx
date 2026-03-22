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
import { AnimatedCard } from '../cards/AnimatedCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem } from '../table/types';
import { OpponentDragState } from '../../hooks/useGameState';
import { StackActionStrip } from '../table/StackActionStrip';
import { areTeammates } from '../../shared/game/team';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';
import { useDealingAnimation } from '../../hooks/useDealingAnimation';

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
  /** Game state for Shiya qualification check */
  gameState?: GameState;
  /** Current player index */
  currentPlayer?: number;
  /** Selected build for Shiya check */
  selectedBuild?: any | null;
  /** Shiya callback - for party mode capture of teammate's build */
  onShiya?: (stackId: string) => void;
  /** Pending drop card - for optimistic UI to hide card immediately after drop */
  pendingDropCard?: Card | null;
  /** Pending drop source - 'hand' | 'captured' | 'table' | null */
  pendingDropSource?: 'hand' | 'captured' | 'table' | null;
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
  gameState,
  currentPlayer,
  selectedBuild,
  onShiya,
  pendingDropCard,
  pendingDropSource,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // Track dealing animations for the local player's hand
  const { animatingCardIds, getCardDelay, onAnimationComplete } = useDealingAnimation(hand);
  
  // Calculate responsive card dimensions based on screen width
  // Show only top half of card (half height for container)
  // Always use standard DEFAULT dimensions - no conditional scaling
  const { cardOverlap, handWidth, containerHeight, responsiveCardWidth, responsiveCardHeight, centerOffset, shouldCenterCards, containerPaddingHorizontal } = useMemo(() => {
    const numCards = hand.length;
    
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
  }, [hand.length, screenWidth]);

  // Check if Shiya action is available for selected build
  // The button appears when player taps on a qualifying build (before/during turn)
  const canShiya = useMemo(() => {
    // Must have selectedBuild and onShiya callback
    // (selectedBuild is now set by tapping on a build, validated in GameBoard)
    if (!selectedBuild || !onShiya) {
      return false;
    }
    return true;
  }, [selectedBuild, onShiya]);

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
        {hand.map((card, index) => {
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
          
          // Check if card should animate (new card being dealt)
          const animatingCardId = `${card.rank}${card.suit}`;
          const shouldAnimate = animatingCardIds.has(animatingCardId);
          const delayMs = shouldAnimate ? getCardDelay(card) : 0;
          
          // Calculate final position within the hand for proper slide-in
          // Each card's position = index * (cardWidth - overlap)
          const cardSpacing = responsiveCardWidth - cardOverlap;
          const finalPosition = index * cardSpacing;
          
          return (
            <AnimatedCard
              key={cardId}
              card={card}
              shouldAnimate={shouldAnimate}
              delayMs={delayMs}
              onAnimationComplete={onAnimationComplete}
              finalPosition={finalPosition}
              cardWidth={responsiveCardWidth}
            >
              <View
                style={{
                  width: responsiveCardWidth,
                  height: responsiveCardHeight,
                  marginRight: index === hand.length - 1 ? 0 : -cardOverlap,
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
            </AnimatedCard>
          );
        })}
      </ScrollView>
      
      {/* Action strip for pending stack OR Shiya - positioned on the right side */}
      {((activeStackId && activeStackType && onAcceptStack && onCancelStack) || canShiya) ? (
        <View style={styles.actionStripContainer}>
          <View style={styles.actionButtons}>
            {activeStackId && activeStackType && onAcceptStack && onCancelStack && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => onAcceptStack && activeStackId && onAcceptStack(activeStackId)}
                  accessibilityLabel={activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
                >
                  <Text style={styles.actionButtonText}>
                    {activeStackType === 'extend_build' ? 'Extend' : 'Accept'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => onCancelStack && activeStackId && onCancelStack(activeStackId)}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {canShiya && (
              <TouchableOpacity
                style={[styles.actionButton, styles.shiyaButton]}
                onPress={() => {
                  if (selectedBuild && onShiya) {
                    // Use the actual stackId from the selected build
                    onShiya(selectedBuild.stackId);
                  }
                }}
                accessibilityLabel="Shiya"
              >
                <Text style={styles.actionButtonText}>Shiya</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      {/* End Turn button - shown after steal - styled to match StackActionStrip */}
      {showEndTurnButton && onEndTurn && (
        <View style={styles.endTurnContainer}>
          <TouchableOpacity
            style={styles.endTurnButton}
            onPress={onEndTurn}
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
  shiyaButton: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
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
