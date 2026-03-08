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
  onDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string) => void;
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
    // If required callbacks are missing, reset locally but still try to signal parent
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      console.log('[DraggableOpponentCard] Missing callbacks in handleDragEndInternal, resetting locally');
      // Still try to call onDragEnd to clean up ghost - pass undefined to indicate cancelled
      if (onDragEnd) {
        onDragEnd(card, undefined, undefined);
      }
      // Always reset local drag state
      translateX.value = 0;
      translateY.value = 0;
      isDragging.value = false;
      draggedCard.value = null;
      return;
    }

    let handled = false;

    // Check if dropped on a loose card
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      console.log('[DraggableOpponentCard] Dropped on card:', targetCardResult.card);
      onDragEnd(card, targetCardResult.card);
      handled = true;
    } else {
      // Check if dropped on a temp stack or build stack
      const targetStack = findTempStackAtPoint(absX, absY);
      if (targetStack) {
        // Can extend own or teammate's build (in party mode)
        if (targetStack.stackType === 'build_stack' && isFriendlyBuild(targetStack.owner)) {
          if (onExtendBuild) {
            console.log('[DraggableOpponentCard] Extending build:', targetStack.stackId);
            onExtendBuild(card, targetStack.stackId, 'captured');
            handled = true;
          }
        } else if (targetStack.owner === playerNumber) {
          // Can only add to own temp stack
          console.log('[DraggableOpponentCard] Dropped on own stack:', targetStack.stackId);
          onDragEnd(card, undefined, targetStack.stackId);
          handled = true;
        }
      }
    }

    // If no valid target was found, signal a cancelled drop to ensure ghost is cleaned up
    if (!handled) {
      console.log('[DraggableOpponentCard] Drag missed - calling onDragEnd with undefined to clean up ghost');
      onDragEnd(card, undefined, undefined);
    }

    // Always reset local drag state
    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;
    draggedCard.value = null;
  }, [onDragEnd, findCardAtPoint, findTempStackAtPoint, onExtendBuild, playerNumber, isFriendlyBuild, translateX, translateY, isDragging, draggedCard]);

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
