/**
 * OpponentGhostStack
 * Renders a ghost stack showing where an opponent is dragging a temp/build stack
 * Used for real-time shared state - opponents see each other's stack drags
 * 
 * Features:
 * - Shows top card of the stack (last card in array)
 * - Badge showing stack count
 * - Smooth animation using Reanimated shared values
 * - Snaps to target position on drag end
 * - Fades out after reaching final position
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../hooks/useGameState';
import { denormalizePosition, TableBounds } from '../../shared/coordinates';

import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

interface OpponentGhostStackProps {
  cards: Card[];
  position: { x: number; y: number }; // normalized 0-1
  tableBounds: TableBounds;
  targetType?: 'card' | 'stack' | 'temp_stack' | 'build_stack' | 'capture' | 'table';
  targetId?: string;
  stackPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
  buildStackPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
  capturePositions?: Map<number, { x: number; y: number; width: number; height: number }>;
}

const SPRING_FINAL_CONFIG = { damping: 15, stiffness: 150 };
const SPRING_DRAG_CONFIG = { damping: 20, stiffness: 200 };

export const OpponentGhostStack = React.memo(function OpponentGhostStack({ 
  cards, 
  position, 
  tableBounds, 
  targetType, 
  targetId,
  stackPositions,
  buildStackPositions,
  capturePositions,
}: OpponentGhostStackProps) {
  const topCard = cards[cards.length - 1];
  const stackCount = cards.length;

  const initialBounds = useMemo(() => ({
    width: tableBounds.width > 0 ? tableBounds.width : 400,
    height: tableBounds.height > 0 ? tableBounds.height : 300,
  }), [tableBounds.width, tableBounds.height]);

  const initialAbsPos = useMemo(
    () => denormalizePosition(position.x, position.y, initialBounds),
    [position.x, position.y, initialBounds]
  );
  
  const translateX = useSharedValue(initialAbsPos.x - CARD_WIDTH / 2);
  const translateY = useSharedValue(initialAbsPos.y - CARD_HEIGHT / 2);
  const opacity = useSharedValue(1);
  
  const isFinalPosition = useRef(false);

  useEffect(() => {
    console.log('[OpponentGhostStack] Rendering ghost:', cards[0]?.rank + cards[0]?.suit, 'targetId=', targetId);
    const bounds = {
      width: tableBounds.width > 0 ? tableBounds.width : 400,
      height: tableBounds.height > 0 ? tableBounds.height : 300,
    };
    
    let displayPosition = position;
    let shouldFadeOut = false;
    
    if (targetId && (stackPositions || buildStackPositions || capturePositions)) {
      if ((targetType === 'stack' || targetType === 'temp_stack') && stackPositions) {
        const targetPos = stackPositions.get(targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
          isFinalPosition.current = true;
          shouldFadeOut = true;
        }
      } else if (targetType === 'build_stack' && buildStackPositions) {
        const targetPos = buildStackPositions.get(targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
          isFinalPosition.current = true;
          shouldFadeOut = true;
        }
      } else if (targetType === 'capture' && capturePositions) {
        const playerIndex = parseInt(targetId, 10);
        const targetPos = capturePositions.get(playerIndex);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
          isFinalPosition.current = true;
          shouldFadeOut = true;
        }
      }
    }

    const absPos = denormalizePosition(displayPosition.x, displayPosition.y, bounds);

    if (shouldFadeOut) {
      translateX.value = withSpring(
        absPos.x - CARD_WIDTH / 2,
        SPRING_FINAL_CONFIG,
        (finished) => {
          if (finished) {
            opacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
          }
        }
      );
      translateY.value = withSpring(absPos.y - CARD_HEIGHT / 2, SPRING_FINAL_CONFIG);
    } else {
      translateX.value = withSpring(absPos.x - CARD_WIDTH / 2, SPRING_DRAG_CONFIG);
      translateY.value = withSpring(absPos.y - CARD_HEIGHT / 2, SPRING_DRAG_CONFIG);
      opacity.value = 1;
    }
  }, [position.x, position.y, targetType, targetId, tableBounds.width, tableBounds.height, stackPositions, capturePositions]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ghost,
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.cardWrapper}>
        <PlayingCard rank={topCard.rank} suit={topCard.suit} />
        {stackCount > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stackCount}</Text>
          </View>
        )}
      </View>
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
  cardWrapper: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OpponentGhostStack;