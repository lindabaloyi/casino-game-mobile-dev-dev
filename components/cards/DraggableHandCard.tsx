/**
 * DraggableHandCard
 * A hand card the player can drag to the table.
 *
 * Drop detection (JS-thread — never inside a worklet):
 *  1. If the finger lands on a SPECIFIC table card → onCardDrop(handCard, targetCard)
 *     → GameBoard sends createTemp action
 *  2. If the finger lands anywhere on the table → onTrail(handCard)
 *     → GameBoard sends trail action
 *  3. Otherwise → snap back
 *
 * Threading note:
 *   On native, RNGH callbacks run as UI-thread worklets. Reanimated serialises
 *   captured JS objects at worklet-creation time, so dropBounds / cardPositions
 *   refs captured inside the worklet are stale. The fix: pass only raw
 *   coordinates from the worklet, then read refs inside runOnJS handlers on the
 *   JS thread where refs are always fresh.
 */

import React, { MutableRefObject } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from './PlayingCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem, BuildStack, isBuildStack } from '../table/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface Props {
  card: Card;
  dropBounds: MutableRefObject<DropBounds>;
  /** Finds a specific table card at (x, y); returns null if no card there */
  findCardAtPoint: (x: number, y: number) => Card | null;
  /** Finds a stack at (x, y); returns null if no stack there */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  /** Check if near any table card (for proximity prevention) */
  isNearAnyCard?: (x: number, y: number) => boolean;
  /** Check if near any temp stack (for proximity prevention) */
  isNearAnyStack?: (x: number, y: number) => boolean;
  isMyTurn: boolean;
  playerNumber: number;
  /** Player's hand - needed for capture vs extend logic */
  playerHand?: Card[];
  /** Table cards - needed to find build stack value */
  tableCards?: TableItem[];
  onTrail: (card: Card) => void;
  /** Called when the dragged card lands on a specific table card */
  onCardDrop: (handCard: Card, targetCard: Card) => void;
  /** Extend build callback - for extending own build with hand card */
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
  /** Overlay callbacks */
  onDragStart: (card: Card) => void;
  onDragMove: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: () => void;
  /** Capture - for capturing loose cards or opponent's builds */
  onCapture: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableHandCard({
  card,
  dropBounds,
  findCardAtPoint,
  findTempStackAtPoint,
  isNearAnyCard,
  isNearAnyStack,
  isMyTurn,
  playerNumber,
  playerHand,
  tableCards,
  onTrail,
  onCardDrop,
  onExtendBuild,
  onDragStart,
  onDragMove,
  onDragEnd,
  onCapture,
}: Props) {
  const opacity = useSharedValue(1);

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

  // Helper: Check if player has any card in hand (excluding the dragged card) that can capture the build
  const hasSpareCaptureCard = (buildValue: number, excludeCard: Card) => {
    if (!playerHand) return false;
    // Player has a spare capture card if any card in hand (except the one being dragged) matches the build value
    return playerHand.some(c => c.value === buildValue && (c.rank !== excludeCard.rank || c.suit !== excludeCard.suit));
  };

  // ── JS-thread helpers ─────────────────────────────────────────────────────

  function handleDragStart() { onDragStart(card); }
  function handleDragMove(x: number, y: number) { onDragMove(x, y); }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    onDragEnd();
  }

  /**
   * handleDrop — runs on the JS thread.
   *
   * Priority:
   *   1. Build stack hit → capture or extend (based on rules below)
   *   2. Specific table card hit → createTemp
   *   3. Near any card/stack but not directly on one → snap back (no trail!)
   *   4. General table area hit → trail
   *   5. Outside table → snap back
   *
   * Capture vs Extend rules for hand cards:
   *   - Own build stack:
   *     - If hand card value == build value AND player has NO spare → CAPTURE
   *     - If hand card value == build value AND player HAS spare → EXTEND
   *     - If hand card value != build value → EXTEND (normal stack)
   *   - Opponent's build stack → CAPTURE
   */
  function handleDrop(absX: number, absY: number) {
    // 0. Check for a build stack under the finger
    const stackHit = findTempStackAtPoint(absX, absY);
    if (stackHit && stackHit.stackType === 'build_stack') {
      // Own build - need to decide capture vs extend
      if (stackHit.owner === playerNumber) {
        const buildStack = findBuildStack(stackHit.stackId);
        const buildValue = buildStack?.value ?? 0;
        const canCaptureWithHand = card.value === buildValue;
        const hasSpare = hasSpareCaptureCard(buildValue, card);

        console.log(
          `[DraggableHandCard] OWN BUILD — ${card.rank}${card.suit} → stack ${stackHit.stackId}, buildValue=${buildValue}, canCapture=${canCaptureWithHand}, hasSpare=${hasSpare}`,
        );

        if (canCaptureWithHand && !hasSpare) {
          // Direct capture: hand card matches build value AND no spare in hand
          console.log(`[DraggableHandCard] CAPTURE OWN BUILD — matches, no spare`);
          onDragEnd();
          onCapture(card, 'build', undefined, undefined, stackHit.stackId);
          return;
        } else {
          // Extend: either card doesn't match, or has spare (player wants to extend)
          console.log(`[DraggableHandCard] EXTEND BUILD — ${card.rank}${card.suit} → stack ${stackHit.stackId}`);
          onDragEnd();
          if (onExtendBuild) {
            onExtendBuild(card, stackHit.stackId, 'hand');
          }
          return;
        }
      } else {
        // Opponent's build - always capture
        console.log(
          `[DraggableHandCard] CAPTURE BUILD — ${card.rank}${card.suit} → stack ${stackHit.stackId}`,
        );
        onDragEnd();
        onCapture(card, 'build', undefined, undefined, stackHit.stackId);
        return;
      }
    }

    // 1. Check for a specific table card under the finger
    const targetCard = findCardAtPoint(absX, absY);
    if (targetCard) {
      console.log(
        `[DraggableHandCard] CARD DROP — ${card.rank}${card.suit} → ${targetCard.rank}${targetCard.suit}`,
      );
      onDragEnd();
      onCardDrop(card, targetCard);
      return;
    }

    // 2. PROXIMITY CHECK: If near any card/stack but not directly on one, snap back
    // This prevents accidental trailing when card is close to but not on a table item
    const nearCard = isNearAnyCard?.(absX, absY);
    const nearStack = isNearAnyStack?.(absX, absY);
    
    if (nearCard || nearStack) {
      console.log(
        `[DraggableHandCard] PROXIMITY — card near table item but not directly on it`,
        `| nearCard: ${nearCard}, nearStack: ${nearStack}`,
      );
      handleSnapBack();
      return;
    }

    // 3. General table drop → trail
    const b = dropBounds.current;
    const inZone =
      absX >= b.x &&
      absX <= b.x + b.width &&
      absY >= b.y &&
      absY <= b.y + b.height;

    console.log(
      `[DraggableHandCard] DROP — card: ${card.rank}${card.suit}`,
      `| finger: (${absX.toFixed(1)}, ${absY.toFixed(1)})`,
      `| bounds: x=${b.x.toFixed(1)} y=${b.y.toFixed(1)} w=${b.width.toFixed(1)} h=${b.height.toFixed(1)}`,
      `| inZone: ${inZone}`,
    );

    if (inZone) {
      onDragEnd();
      onTrail(card);
    } else {
      handleSnapBack();
    }
  }

  function logDragStart(absX: number, absY: number) {
    console.log(
      `[DraggableHandCard] DRAG START — card: ${card.rank}${card.suit}`,
      `| finger: (${absX.toFixed(1)}, ${absY.toFixed(1)})`,
      `| isMyTurn: ${isMyTurn}`,
    );
  }

  // ── Gesture ───────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      runOnJS(handleDragStart)();
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
      runOnJS(logDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      // Pass ONLY coordinates to JS thread — refs are read there (always fresh)
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableHandCard;
