/**
 * DraggableTableCard
 * A loose table card the current player can drag to:
 *   → Another loose table card  → createTemp action
 *   → Their own temp stack      → addToTemp action
 *   → Miss                      → no server call, opacity restored
 *
 * Threading note: same pattern as DraggableHandCard — only raw coordinates
 * are passed from the UI worklet into JS-thread handlers so that refs are
 * always read fresh.
 */

import React from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card, TableItem, BuildStack, isBuildStack } from './types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  card:         Card;
  isMyTurn:     boolean;
  playerNumber: number;
  /**
   * excludeId = `${rank}${suit}` of the dragged card — prevents self-match
   * in the card position registry.
   */
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => Card | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack'; value?: number } | null;
  /** Player's hand - needed for capture vs extend logic */
  playerHand?: Card[];
  /** Table cards - needed to find build stack value */
  tableCards?: TableItem[];
  /** Dragged loose card dropped on another loose card → createTemp */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  /** Dragged loose card dropped on own temp stack → addToTemp */
  onDropOnTemp: (card: Card, stackId: string)  => void;
  /** Dragged loose card dropped on own build stack → startBuildExtension */
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
  /** Ghost overlay callbacks */
  onDragStart: (card: Card) => void;
  onDragMove:  (absoluteX: number, absoluteY: number) => void;
  onDragEnd:   () => void;
  /** Capture - for capturing opponent's builds */
  onCapture: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableTableCard({
  card,
  isMyTurn,
  playerNumber,
  findCardAtPoint,
  findTempStackAtPoint,
  playerHand,
  tableCards,
  onDropOnCard,
  onDropOnTemp,
  onExtendBuild,
  onDragStart,
  onDragMove,
  onDragEnd,
  onCapture,
}: Props) {
  const opacity = useSharedValue(1);
  const cardId  = `${card.rank}${card.suit}`;

  // Helper: Find a build stack from tableCards by stackId
  const findBuildStack = (stackId: string): BuildStack | null => {
    if (!tableCards) return null;
    for (const tc of tableCards) {
      if (isBuildStack(tc) && tc.stackId === stackId) {
        return tc;
      }
    }
    return null;
  };

  // Helper: Check if player has any card in hand that can capture the build
  const hasCaptureCardInHand = (buildValue: number) => {
    if (!playerHand) return false;
    // Player has a capture card if any card in hand matches the build value
    return playerHand.some(c => c.value === buildValue);
  };

  // ── JS-thread handlers ────────────────────────────────────────────────────

  function _onDragStart()                        { onDragStart(card); }
  function _onDragMove(x: number, y: number)     { onDragMove(x, y); }

  function handleDrop(absX: number, absY: number) {
    // 1. Check if dropped on a stack (temp or build)
    const tempHit = findTempStackAtPoint(absX, absY);
    if (tempHit) {
      // Own temp stack - add to temp
      if (tempHit.stackType === 'temp_stack' && tempHit.owner === playerNumber) {
        console.log(`[DraggableTableCard] DROP ON TEMP — ${cardId} → stack ${tempHit.stackId}`);
        onDragEnd();
        onDropOnTemp(card, tempHit.stackId);
        return;
      }
      
      // Own build stack - ALWAYS EXTEND (loose cards can only extend, never capture own builds)
      if (tempHit.stackType === 'build_stack' && tempHit.owner === playerNumber) {
        // Find the build stack to get its value
        const buildStack = findBuildStack(tempHit.stackId);
        const buildValue = buildStack?.value ?? tempHit.value ?? 0;
        
        console.log(`[DraggableTableCard] EXTEND BUILD — ${cardId} → stack ${tempHit.stackId}, buildValue=${buildValue}`);
        
        // Loose cards can only EXTEND builds (not capture them)
        // Hand cards are the ones that can capture
        onDragEnd();
        if (onExtendBuild) {
          onExtendBuild(card, tempHit.stackId, 'table');
        }
        return;
      }
      
      // Opponent's build - capture!
      if (tempHit.owner !== playerNumber) {
        console.log(`[DraggableTableCard] CAPTURE BUILD — ${cardId} → stack ${tempHit.stackId}`);
        onDragEnd();
        onCapture(card, 'build', undefined, undefined, tempHit.stackId);
        return;
      }
    }

    // 2. Check if dropped on another loose table card (exclude self)
    const cardHit = findCardAtPoint(absX, absY, cardId);
    if (cardHit) {
      console.log(`[DraggableTableCard] DROP ON CARD — ${cardId} → ${cardHit.rank}${cardHit.suit}`);
      onDragEnd();
      onDropOnCard(card, cardHit);
      return;
    }

    // 3. Miss — card stays on table, restore opacity
    console.log(`[DraggableTableCard] MISS — ${cardId} snapping back`);
    opacity.value = withSpring(1);
    onDragEnd();
  }

  // ── Gesture ───────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      runOnJS(_onDragStart)();
      runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableTableCard;
