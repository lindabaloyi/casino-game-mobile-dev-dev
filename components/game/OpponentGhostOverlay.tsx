/**
 * OpponentGhostOverlay
 *
 * Ghost rendering for opponent's drag operations.
 * Shows ghost card for SINGLE CARD sources:
 * - hand, table, captured → shows that card
 *
 * Does NOT show ghost for stack sources (temp_stack, build_stack).
 *
 * Features:
 * - Smooth animation using Reanimated shared values
 * - Follows cursor position during drag
 * - No badges, no tags - just the card
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../hooks/useGameState';
import { denormalizePosition, TableBounds } from '../../shared/coordinates';

import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

export interface PositionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionRegistry {
  cards?: Map<string, PositionBounds>;
  tempStacks?: Map<string, PositionBounds>;
  buildStacks?: Map<string, PositionBounds>;
  capturePiles?: Map<number, PositionBounds>;
}

interface OpponentGhostOverlayProps {
  /** Full opponent drag state */
  opponentDrag: {
    playerIndex: number;
    source: 'hand' | 'table' | 'captured' | 'temp_stack' | 'build_stack';
    isDragging: boolean;
    position: { x: number; y: number };
    card?: Card;
    cardId?: string;
    cards?: Card[];
    stackId?: string;
    targetType?: 'card' | 'stack' | 'temp_stack' | 'build_stack' | 'capture' | 'table';
    targetId?: string;
  };
  tableBounds: TableBounds;
  positionRegistry?: PositionRegistry;
}

// Spring config constants - defined outside component to avoid recreation
const SPRING_FINAL_CONFIG = { damping: 15, stiffness: 150 };
const SPRING_DRAG_CONFIG = { damping: 20, stiffness: 200 };

export const OpponentGhostOverlay = React.memo(function OpponentGhostOverlay({
  opponentDrag,
  tableBounds,
  positionRegistry,
}: OpponentGhostOverlayProps) {
  // Always get the TOP card - regardless of source
  // For single cards: just that card
  // For stacks: last card in array (top of stack)
  const topCard = useMemo(() => {
    if (opponentDrag.cards && opponentDrag.cards.length > 0) {
      // Stack source - return top card (last in array)
      return opponentDrag.cards[opponentDrag.cards.length - 1];
    }
    // Single card source
    return opponentDrag.card;
  }, [opponentDrag.cards, opponentDrag.card]);

  // Memoize bounds for position calculation
  const bounds = useMemo(() => ({
    width: tableBounds.width > 0 ? tableBounds.width : 400,
    height: tableBounds.height > 0 ? tableBounds.height : 300,
  }), [tableBounds.width, tableBounds.height]);

  // Initial absolute position from normalized coordinates
  const initialAbsPos = useMemo(
    () => denormalizePosition(opponentDrag.position.x, opponentDrag.position.y, bounds),
    [opponentDrag.position.x, opponentDrag.position.y, bounds]
  );

  // Use shared values for animation - initialize to current position
  const translateX = useSharedValue(initialAbsPos.x - CARD_WIDTH / 2);
  const translateY = useSharedValue(initialAbsPos.y - CARD_HEIGHT / 2);

  useEffect(() => {
    // Determine display position with target snapping
    let displayPosition = opponentDrag.position;

    if (opponentDrag.targetId && positionRegistry) {
      if (opponentDrag.targetType === 'card' && positionRegistry.cards) {
        const targetPos = positionRegistry.cards.get(opponentDrag.targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
        }
      } else if ((opponentDrag.targetType === 'stack' || opponentDrag.targetType === 'temp_stack') && positionRegistry.tempStacks) {
        const targetPos = positionRegistry.tempStacks.get(opponentDrag.targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
        }
      } else if (opponentDrag.targetType === 'build_stack' && positionRegistry.buildStacks) {
        const targetPos = positionRegistry.buildStacks.get(opponentDrag.targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
        }
      } else if (opponentDrag.targetType === 'capture' && positionRegistry.capturePiles) {
        const playerIndex = parseInt(opponentDrag.targetId, 10);
        const targetPos = positionRegistry.capturePiles.get(playerIndex);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
        }
      }
    }

    // Convert to absolute coordinates
    const absPos = denormalizePosition(displayPosition.x, displayPosition.y, bounds);

    // Smooth follow during drag
    translateX.value = withSpring(absPos.x - CARD_WIDTH / 2, SPRING_DRAG_CONFIG);
    translateY.value = withSpring(absPos.y - CARD_HEIGHT / 2, SPRING_DRAG_CONFIG);
  }, [
    opponentDrag.position.x,
    opponentDrag.position.y,
    opponentDrag.targetType,
    opponentDrag.targetId,
    opponentDrag.isDragging,
    tableBounds.width,
    tableBounds.height,
    positionRegistry,
    translateX,
    translateY,
    bounds,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
  }));

  // Don't render if no card to show
  if (!topCard) {
    return null;
  }

  // Skip ghost for temp/build stacks - ghost not needed for stack drags
  if (opponentDrag.source === 'temp_stack' || opponentDrag.source === 'build_stack') {
    return null;
  }

  // Determine styling based on source
  const shouldScale = opponentDrag.source === 'hand';

  return (
    <Animated.View
      style={[
        styles.ghost,
        animatedStyle,
        shouldScale && styles.scaled,
      ]}
      pointerEvents="none"
    >
      <PlayingCard rank={topCard.rank} suit={topCard.suit} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1000,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  scaled: {
    transform: [{ scale: 1.05 }],
  },
});

export default OpponentGhostOverlay;