/**
 * DraggableOpponentCard
 * A draggable card component for opponent's captured cards.
 * Extracted from CapturedCardsView for better separation of concerns.
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';
import { OpponentDragState } from '../../hooks/useGameState';
import { areTeammates } from '../../shared/game/team';

export interface DraggableOpponentCardProps {
  card: Card;
  opponentIndex: number;
  isMyTurn: boolean;
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (card: Card, absX: number, absY: number) => void;
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  playerNumber: number;
  playerCount?: number;
  isPartyMode?: boolean;
  opponentDrag?: OpponentDragState | null;
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
}

export function DraggableOpponentCard({
  card,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  findCardAtPoint,
  findTempStackAtPoint,
  playerNumber,
  playerCount = 2,
  isPartyMode: isPartyModeProp,
  opponentDrag,
  onExtendBuild
}: DraggableOpponentCardProps) {
  // Determine party mode
  const isPartyMode = isPartyModeProp ?? playerCount === 4;
   
  // Helper to check if a build is friendly (owner or teammate in party mode)
  const isFriendlyBuild = useCallback((buildOwner: number): boolean => {
    if (buildOwner === playerNumber) return true;
    if (isPartyMode) {
      return areTeammates(playerNumber, buildOwner);
    }
    return false;
  }, [playerNumber, isPartyMode]);

  const cardRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const draggedCard = useSharedValue<Card | null>(null);

  const handleDragEndInternal = useCallback((card: Card, absX: number, absY: number) => {
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      return;
    }

    // Check if dropped on a loose card
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      onDragEnd(card, absX, absY);
      // Reset position
      translateX.value = 0;
      translateY.value = 0;
      isDragging.value = false;
      draggedCard.value = null;
      return;
    }

    // Check if dropped on a temp stack or build stack
    const targetStack = findTempStackAtPoint(absX, absY);
    if (targetStack) {
      // Can extend own or teammate's build (in party mode)
      if (targetStack.stackType === 'build_stack' && isFriendlyBuild(targetStack.owner)) {
        if (onExtendBuild) {
          onExtendBuild(card, targetStack.stackId, 'captured');
        }
        // Reset position immediately after extending
        translateX.value = 0;
        translateY.value = 0;
        isDragging.value = false;
        draggedCard.value = null;
        return;
      } else if (targetStack.owner === playerNumber) {
        // Can only add to own temp stack
        onDragEnd(card, absX, absY);
        // Reset position
        translateX.value = 0;
        translateY.value = 0;
        isDragging.value = false;
        draggedCard.value = null;
        return;
      }
    }

    // Reset position
    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;
    draggedCard.value = null;
  }, [onDragEnd, findCardAtPoint, findTempStackAtPoint, playerNumber, onExtendBuild, translateX, translateY, isDragging, draggedCard, isFriendlyBuild]);

  const panGesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart((event) => {
      isDragging.value = true;
      draggedCard.value = card;
      if (onDragStart) onDragStart(card, event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        if (onDragMove) onDragMove(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (isDragging.value && draggedCard.value) {
        handleDragEndInternal(draggedCard.value, event.absoluteX, event.absoluteY);
      }
      // Note: Position reset is now handled in handleDragEndInternal
      // Only reset dragging state here in case handleDragEndInternal wasn't called
      isDragging.value = false;
      draggedCard.value = null;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
    opacity: isDragging.value ? 0 : 1,
  }));

  // Check if this card is being dragged by opponent
  const cardId = `${card.rank}${card.suit}`;
  const isHidden = opponentDrag?.isDragging &&
                   opponentDrag.source === 'captured' &&
                   opponentDrag.cardId === cardId;

  if (isHidden) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>-</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <View ref={cardRef}>
          <PlayingCard rank={card.rank} suit={card.suit} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    width: 56,
    height: 84,
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

export default DraggableOpponentCard;
