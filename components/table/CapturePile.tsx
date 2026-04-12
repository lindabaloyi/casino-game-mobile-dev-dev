/**
 * CapturePile
 * Renders a single capture pile: label and top card.
 * Can be draggable (for opponents) or non-draggable (for player/teammate).
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity , StyleSheet, Text, View } from 'react-native';

import { PlayingCard } from '../cards/PlayingCard';
import { DraggableOpponentCard } from './DraggableOpponentCard';
import { Card } from './types';
import { OpponentDragState } from '../../hooks/useGameState';
import { CapturePileBounds } from '../../hooks/useDrag';
import { type TeamColors } from '../../constants/teamColors';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

interface CapturePileProps {
  /** Player index for this pile (0-3) */
  playerIndex: number;
  /** Captured cards array */
  captures: Card[];
  /** Whether this player is currently active (their turn) */
  isActive: boolean;
  /** Whether it's the current player's turn (for enabling drag) */
  isMyTurn: boolean;
  /** Whether the card can be dragged (only true for opponents) */
  isDraggable: boolean;
  /** Current player number (for determining friendly builds) */
  playerNumber: number;
  /** Total player count */
  playerCount: number;
  /** Whether party mode is enabled */
  isPartyMode: boolean;
  /** Drag callbacks */
  onDragStart?: (card: Card, x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string, source?: string) => void;
  /** Find card at point callback */
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  /** Find temp stack at point callback */
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  /** Extend build callback */
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured' | `captured_${number}`) => void;
  /** Callback for capturing opponent's build with a captured card */
  onCaptureBuild?: (card: Card, stackId: string, cardSource: 'captured' | `captured_${number}`) => void;
  /** Sound callback - called on ANY successful drop of opponent's captured card */
  onCardPlayed?: () => void;
  /** Opponent drag state */
  opponentDrag?: OpponentDragState | null;
  /** Registration callbacks */
  registerCapturePile?: (bounds: CapturePileBounds) => void;
  unregisterCapturePile?: (playerIndex: number) => void;
  /** Team utilities */
  getPlayerLabel: (idx: number) => string;
  getPlayerTeamColors: (idx: number) => TeamColors;
  /** Callback for double-tap to recall captured items (Shiya) */
  onRecallAttempt?: (targetPlayerIndex: number) => void;
}

export function CapturePile({
  playerIndex,
  captures,
  isActive,
  isMyTurn,
  isDraggable,
  playerNumber,
  playerCount,
  isPartyMode,
  onDragStart,
  onDragMove,
  onDragEnd,
  findCardAtPoint,
  findTempStackAtPoint,
  onExtendBuild,
  onCaptureBuild,
  onCardPlayed,
  opponentDrag,
  registerCapturePile,
  unregisterCapturePile,
  getPlayerLabel,
  getPlayerTeamColors,
  onRecallAttempt,
}: CapturePileProps) {

  // Get top card (last in array = most recently captured)
  const topCard = captures.length > 0 ? captures[captures.length - 1] : null;
  const colors = getPlayerTeamColors(playerIndex);
  const label = getPlayerLabel(playerIndex);
  const ringColor = isActive ? colors.primary : 'transparent';

  // Ref for measuring this pile
  const pileRef = useRef<View>(null);
  const hasRegisteredRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  // Handle double-tap for Shiya recall
  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (onRecallAttempt && captures.length > 0) {
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        // Double tap detected - attempt recall
        onRecallAttempt(playerIndex);
      }
    }
    lastTapRef.current = now;
  }, [playerIndex, captures.length, onRecallAttempt]);

  // Register pile bounds on mount
  useEffect(() => {
    if (pileRef.current && registerCapturePile && !hasRegisteredRef.current) {
      const timeout = setTimeout(() => {
        pileRef.current?.measureInWindow((x, y, width, height) => {
          registerCapturePile({ x, y, width, height, playerIndex });
          hasRegisteredRef.current = true;
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [registerCapturePile, playerIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterCapturePile) {
        unregisterCapturePile(playerIndex);
      }
    };
  }, [unregisterCapturePile, playerIndex]);

  // Internal drag handlers
  const handleDragStart = useCallback((card: Card, x: number, y: number) => {
    onDragStart?.(card, x, y);
  }, [onDragStart]);

  const handleDragMove = useCallback((x: number, y: number) => {
    onDragMove?.(x, y);
  }, [onDragMove]);

  const handleDragEnd = useCallback((card: Card, targetCard?: Card, targetStackId?: string) => {
    // Pass source with owner player index so server knows which pile to check
    const source = `captured_${playerIndex}`;
    onDragEnd?.(card, targetCard, targetStackId, source);
  }, [onDragEnd, playerIndex]);

  // Render the card (draggable or non-draggable)
  const renderCard = () => {
    if (!topCard) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>-</Text>
        </View>
      );
    }

    if (isDraggable && onDragStart && onDragMove && onDragEnd) {
      return (
        <DraggableOpponentCard
          card={topCard}
          opponentIndex={playerIndex}
          isMyTurn={isMyTurn}  // Use the isMyTurn prop - whether IT'S OUR TURN, not opponent's turn
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          findCardAtPoint={findCardAtPoint}
          findTempStackAtPoint={findTempStackAtPoint}
          playerNumber={playerNumber}
          playerCount={playerCount}
          isPartyMode={isPartyMode}
          opponentDrag={opponentDrag}
          onExtendBuild={onExtendBuild}
          onCaptureBuild={onCaptureBuild}
          onCardPlayed={onCardPlayed}
        />
      );
    }

    // Non-draggable card (player or teammate)
    return <PlayingCard rank={topCard.rank} suit={topCard.suit} />;
  };

  return (
    <TouchableOpacity
      ref={pileRef}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.captureSection,
        {
          borderColor: ringColor,
          shadowColor: ringColor !== 'transparent' ? colors.primary : 'transparent',
          shadowOpacity: ringColor !== 'transparent' ? 0.8 : 0,
        },
      ]}
    >
      <View style={[styles.teamLabelContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.teamLabelText}>{label} ({captures.length})</Text>
      </View>
      <View style={[styles.cardContainer, isActive && styles.cardContainerActive]}>
        {renderCard()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  captureSection: {
    alignItems: 'center',
    width: CARD_WIDTH + 8,
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  teamLabelContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 3,
  },
  teamLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardContainerActive: {
    borderWidth: 3,
  },
  emptyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
});

export default CapturePile;
