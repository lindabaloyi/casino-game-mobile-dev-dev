/**
 * CapturedCardsView
 * Displays captured cards on the sides of the table area.
 * 
 * - LEFT side: Opponent's captures (draggable - can play from)
 * - RIGHT side: Your captures (drop target - can capture to)
 * - Shows the TOP card (last in array = most recently captured)
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';
import { CapturePileBounds, CapturedCardBounds } from '../../hooks/useDrag';
import { OpponentDragState } from '../../hooks/useGameState';

interface CapturedCardsViewProps {
  /** Cards captured by the player */
  playerCaptures: Card[];
  /** Cards captured by the opponent */
  opponentCaptures: Card[];
  /** Player number (0 or 1) */
  playerNumber: number;
  /** Whether it's this player's turn */
  isMyTurn?: boolean;
  /** Register captured card position */
  registerCapturedCard?: (bounds: CapturedCardBounds) => void;
  /** Unregister captured card */
  unregisterCapturedCard?: () => void;
  /** Register capture pile bounds */
  registerCapturePile?: (bounds: CapturePileBounds) => void;
  /** Unregister capture pile */
  unregisterCapturePile?: () => void;
  /** Find card at point (for detecting drag over table cards) */
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  /** Find temp stack at point */
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  /** Callback when drag starts */
  onDragStart?: (card: Card) => void;
  /** Callback when drag moves */
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  /** Callback when drag ends - return action to send */
  onDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string) => void;
  /** Extend build callback - for extending own build with captured card */
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
  /** Opponent's drag state - for hiding cards when opponent is dragging */
  opponentDrag?: OpponentDragState | null;
}

export function CapturedCardsView({
  playerCaptures,
  opponentCaptures,
  playerNumber,
  isMyTurn = false,
  registerCapturedCard,
  unregisterCapturedCard,
  registerCapturePile,
  unregisterCapturePile,
  findCardAtPoint,
  findTempStackAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onExtendBuild,
  opponentDrag,
}: CapturedCardsViewProps) {
  const playerLabel = playerNumber === 0 ? 'P1' : 'P2';
  const opponentLabel = playerNumber === 0 ? 'P2' : 'P1';

  // Get the top card (last in array = most recently captured)
  const playerTopCard = playerCaptures.length > 0 
    ? playerCaptures[playerCaptures.length - 1] 
    : null;
  const opponentTopCard = opponentCaptures.length > 0 
    ? opponentCaptures[opponentCaptures.length - 1] 
    : null;

  // Drag state for opponent's card
  const cardRef = useRef<View>(null);
  const playerCaptureRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const draggedCard = useSharedValue<Card | null>(null);

  // Register position on mount/layout
  const handleLayout = useCallback(() => {
    if (cardRef.current && registerCapturedCard && opponentTopCard) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        console.log('[CapturedCardsView] Registering opponent card position:', { x, y, width, height, card: opponentTopCard });
        registerCapturedCard({ x, y, width, height, card: opponentTopCard });
      });
    }
  }, [registerCapturedCard, opponentTopCard]);

  // Register player capture pile bounds
  const handlePlayerCaptureLayout = useCallback(() => {
    if (playerCaptureRef.current && registerCapturePile) {
      playerCaptureRef.current.measureInWindow((x, y, width, height) => {
        console.log('[CapturedCardsView] Registering player capture pile:', { x, y, width, height, playerIndex: playerNumber });
        registerCapturePile({ x, y, width, height, playerIndex: playerNumber });
      });
    }
  }, [registerCapturePile, playerNumber]);

  // Re-register when opponent's top card changes
  useEffect(() => {
    if (cardRef.current && registerCapturedCard && opponentTopCard) {
      // Small delay to ensure the view is laid out
      setTimeout(() => {
        cardRef.current?.measureInWindow((x, y, width, height) => {
          console.log('[CapturedCardsView] Re-registering opponent card:', { x, y, width, height, card: opponentTopCard });
          registerCapturedCard({ x, y, width, height, card: opponentTopCard });
        });
      }, 100);
    }
  }, [registerCapturedCard, opponentTopCard]);

  // Register player capture pile on mount
  useEffect(() => {
    if (playerCaptureRef.current && registerCapturePile) {
      setTimeout(() => {
        playerCaptureRef.current?.measureInWindow((x, y, width, height) => {
          console.log('[CapturedCardsView] Registering player capture pile:', { x, y, width, height, playerIndex: playerNumber });
          registerCapturePile({ x, y, width, height, playerIndex: playerNumber });
        });
      }, 100);
    }
  }, [registerCapturePile, playerNumber]);

  const handleDragStartInternal = useCallback((card: Card) => {
    console.log('[CapturedCardsView] Drag started:', card);
    if (onDragStart) onDragStart(card);
  }, [onDragStart]);

  const handleDragMoveInternal = useCallback((x: number, y: number) => {
    if (onDragMove) onDragMove(x, y);
  }, [onDragMove]);

  // Handle drop using finger position directly (like DraggableHandCard does)
  const handleDragEndInternal = useCallback((card: Card, absX: number, absY: number) => {
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      console.log('[CapturedCardsView] Drag ended - missing callbacks');
      return;
    }

    console.log('[CapturedCardsView] === Captured Card Drag End ===');
    console.log('[CapturedCardsView] Dragging card:', `${card.rank}${card.suit}`);
    console.log('[CapturedCardsView] Drop position:', { absX, absY });

    // Check if dropped on a loose card (using finger position directly)
    const targetCardResult = findCardAtPoint(absX, absY);
    console.log('[CapturedCardsView] findCardAtPoint result:', targetCardResult);
    
    if (targetCardResult) {
      console.log('[CapturedCardsView] Dropped on loose card:', targetCardResult);
      console.log('[CapturedCardsView] Calling onDragEnd with:', { 
        card: `${card.rank}${card.suit}`, 
        targetCard: `${targetCardResult.card.rank}${targetCardResult.card.suit}`
      });
      onDragEnd(card, targetCardResult.card);
      return;
    }

    // Check if dropped on a temp stack or build stack (using finger position directly)
    const targetStack = findTempStackAtPoint(absX, absY);
    if (targetStack) {
      console.log('[CapturedCardsView] Dropped on stack:', targetStack);
      
      // Check if it's a build stack - can extend own build
      if (targetStack.stackType === 'build_stack' && targetStack.owner === playerNumber) {
        // Extending own build with captured card
        console.log('[CapturedCardsView] Extending own build with captured card');
        if (onExtendBuild) {
          onExtendBuild(card, targetStack.stackId, 'captured');
        }
        return;
      }
      
      // Can only add to own temp stack
      if (targetStack.owner === playerNumber) {
        onDragEnd(card, undefined, targetStack.stackId);
      } else {
        console.log('[CapturedCardsView] Cannot add to opponent stack');
      }
      return;
    }

    console.log('[CapturedCardsView] No valid drop target found at finger position');
    // No valid drop target - reset position
    translateX.value = 0;
    translateY.value = 0;
  }, [findCardAtPoint, findTempStackAtPoint, onDragEnd, onExtendBuild, playerNumber, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .enabled(isMyTurn && !!opponentTopCard)
    .onStart(() => {
      if (opponentTopCard) {
        isDragging.value = true;
        draggedCard.value = opponentTopCard;
        runOnJS(handleDragStartInternal)(opponentTopCard);
      }
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        runOnJS(handleDragMoveInternal)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (isDragging.value && draggedCard.value) {
        // Use the finger's absolute position directly for hit detection
        runOnJS(handleDragEndInternal)(draggedCard.value, event.absoluteX, event.absoluteY);
      }
      // Reset after a short delay to allow for action processing
      setTimeout(() => {
        translateX.value = 0;
        translateY.value = 0;
        isDragging.value = false;
        draggedCard.value = null;
      }, 100);
    });

  // Hide the card while dragging - only show ghost overlay
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
    opacity: isDragging.value ? 0 : 1,  // Hide original when dragging
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterCapturedCard) {
        unregisterCapturedCard();
      }
      if (unregisterCapturePile) {
        unregisterCapturePile();
      }
    };
  }, [unregisterCapturedCard, unregisterCapturePile]);

  // Always show: LEFT = opponent captures, RIGHT = your captures
  // (regardless of playerNumber, each player sees their own pile on the right)

  // Check if opponent is dragging this captured card
  const opponentCardId = opponentTopCard ? `${opponentTopCard.rank}${opponentTopCard.suit}` : null;
  const isOpponentCardHidden = opponentDrag?.isDragging &&
                             opponentDrag.source === 'captured' &&
                             opponentDrag.cardId === opponentCardId;

  // Create the two sections
  const playerSection = (
    <View 
      style={styles.captureSection} 
      ref={playerCaptureRef} 
      onLayout={handlePlayerCaptureLayout}
      key="player"
    >
      <Text style={styles.label}>{playerLabel}</Text>
      <View style={styles.cardContainer}>
        {playerTopCard ? (
          <PlayingCard 
            rank={playerTopCard.rank} 
            suit={playerTopCard.suit} 
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>-</Text>
          </View>
        )}
      </View>
      <Text style={styles.count}>{playerCaptures.length}</Text>
    </View>
  );

  const opponentSection = (
    <View style={styles.captureSection} pointerEvents="box-none" key="opponent">
      <Text style={styles.label}>{opponentLabel}</Text>
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          ref={cardRef}
          onLayout={handleLayout}
          style={[
            styles.cardWrapper, 
            animatedStyle,
            isOpponentCardHidden && { opacity: 0 }
          ]}
        >
          {opponentTopCard ? (
            <PlayingCard 
              rank={opponentTopCard.rank} 
              suit={opponentTopCard.suit} 
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>-</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
      <Text style={styles.count}>{opponentCaptures.length}</Text>
    </View>
  );

  // Always: LEFT = opponent captures (draggable), RIGHT = your captures (drop target)
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* LEFT: opponent's captures (draggable) */}
      {opponentSection}
      {/* RIGHT: your captures (drop target) */}
      {playerSection}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  captureSection: {
    alignItems: 'center',
    width: 70,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardContainer: {
    width: 56,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: 56,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  count: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default CapturedCardsView;
