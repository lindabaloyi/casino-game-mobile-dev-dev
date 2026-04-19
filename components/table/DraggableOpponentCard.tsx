/**
 * DraggableOpponentCard
 * A draggable card component for opponent's captured cards.
 * Extracted from CapturedCardsView for better separation of concerns.
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';
import { OpponentDragState } from '../../hooks/useGameState';
import { areTeammates } from '../../shared/game/team';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';
import { useDragContext } from '../../hooks/drag/DragContext';

export interface DraggableOpponentCardProps {
  card: Card;
  opponentIndex: number;
  isMyTurn: boolean;
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string, source?: string) => void;
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  findBuildStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number } | null;
  playerNumber: number;
  playerCount?: number;
  isPartyMode?: boolean;
  opponentDrag?: OpponentDragState | null;
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured' | `captured_${number}`) => void;
  /** Callback for capturing opponent's build with a captured card */
  onCaptureBuild?: (card: Card, stackId: string, cardSource: 'captured' | `captured_${number}`) => void;
  /** Sound callback - called on ANY successful drop of opponent's captured card */
  onCardPlayed?: () => void;
}

export function DraggableOpponentCard({
  card,
  opponentIndex,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  findCardAtPoint,
  findTempStackAtPoint,
  findBuildStackAtPoint,
  playerNumber,
  playerCount = 2,
  isPartyMode: isPartyModeProp,
  opponentDrag,
  onExtendBuild,
  onCaptureBuild,
  onCardPlayed
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
  
  // Use DragContext for UI-thread ghost
  const { dragX, dragY, draggingCard: contextDraggingCard, dragSource } = useDragContext();

  // Handler for drag start (JS thread)
  const handleDragStartInternal = useCallback((x: number, y: number) => {
    if (onDragStart) {
      onDragStart(card, x, y);
    }
    if (onDragMove) {
      onDragMove(x, y);
    }
  }, [card, onDragStart, onDragMove]);

const handleDragEndInternal = useCallback((card: Card, absX: number, absY: number) => {
    // If required callbacks are missing, reset locally but still try to signal parent
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      if (onDragEnd) {
        onDragEnd(card, undefined, undefined);
      }
      translateX.value = 0;
      translateY.value = 0;
      isDragging.value = false;
      draggedCard.value = null;
      return;
    }

    let handled = false;
    let targetStack: { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null = null;

    // Check if dropped on a loose card
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      const targetCard = targetCardResult.card;
      if (targetCard && typeof targetCard === 'object' && 'rank' in targetCard && 'suit' in targetCard) {
        const source = `captured_${opponentIndex}`;
        onDragEnd(card, targetCard, undefined, source);
        handled = true;
        if (onCardPlayed) {
          onCardPlayed();
        }
      } else {
        onDragEnd(card, undefined, undefined);
        handled = true;
      }
    } else {
      // Check if dropped on a stack
      const tempStack = findTempStackAtPoint ? findTempStackAtPoint(absX, absY) : null;
      const buildStack = findBuildStackAtPoint ? findBuildStackAtPoint(absX, absY) : null;
      
      if (buildStack) {
        targetStack = { ...buildStack, stackType: 'build_stack' as const };
      } else if (tempStack) {
        targetStack = { ...tempStack, stackType: 'temp_stack' as const };
      }
    }

    if (targetStack) {
      if (targetStack.stackType === 'build_stack' && isFriendlyBuild(targetStack.owner)) {
        if (onExtendBuild) {
          onExtendBuild(card, targetStack.stackId, `captured_${opponentIndex}`);
          handled = true;
          if (onCardPlayed) onCardPlayed();
        }
      } else if (targetStack.owner === playerNumber) {
        onDragEnd(card, undefined, targetStack.stackId, `captured_${opponentIndex}`);
        handled = true;
        if (onCardPlayed) onCardPlayed();
      } else if (targetStack.stackType === 'build_stack' && onCaptureBuild) {
        onCaptureBuild(card, targetStack.stackId, `captured_${opponentIndex}`);
        handled = true;
        if (onCardPlayed) onCardPlayed();
      }
    }

    if (!handled) {
      onDragEnd(card, undefined, undefined);
    }

    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;
    draggedCard.value = null;
  }, [onDragEnd, findCardAtPoint, findTempStackAtPoint, onExtendBuild, onCaptureBuild, onCardPlayed, playerNumber, isFriendlyBuild, translateX, translateY, isDragging, draggedCard, opponentIndex]);

  // Pan gesture - full UI thread path
  const panGesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart((event) => {
      isDragging.value = true;
      draggedCard.value = card;
      // Write to DragContext for ghost
      contextDraggingCard.value = card;
      dragSource.value = 'captured';
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
      runOnJS(handleDragStartInternal)(event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        // Pure UI thread - update context for ghost
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        dragX.value = event.absoluteX;
        dragY.value = event.absoluteY;
        // Call onDragMove for multiplayer sync
        onDragMove?.(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      // Clear context
      contextDraggingCard.value = null;
      dragSource.value = null;
      if (isDragging.value && draggedCard.value) {
        handleDragEndInternal(draggedCard.value, event.absoluteX, event.absoluteY);
      }
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

  // Check if this card is being dragged by opponent or has been dropped
  // Hide card if:
  // 1. Opponent is actively dragging this card, OR
  // 2. Card has been dropped (has targetId) - optimistic UI to prevent duplicate display
  const cardId = `${card.rank}${card.suit}`;
  const isHidden = Boolean(
    (opponentDrag?.isDragging &&
      opponentDrag.source === 'captured' &&
      opponentDrag.cardId === cardId) ||
    (opponentDrag?.targetId &&
      opponentDrag.source === 'captured' &&
      opponentDrag.cardId === cardId)
  );

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

export default DraggableOpponentCard;
