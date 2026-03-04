/**
 * DraggableHandCard
 * A hand card the player can drag to the table.
 *
 * UI is DUMB - just detects WHAT was hit, SmartRouter decides WHAT IT MEANS.
 *
 * Drop detection (JS-thread — never inside a worklet):
 *   1. If the finger lands on a stack → onDropOnStack(card, stackId, owner, stackType)
 *   2. If the finger lands on a SPECIFIC table card → onDropOnCard(card, targetCard)
 *   3. If the finger lands anywhere on the table → onDropOnTable(card)
 *   4. Otherwise → snap back
 *
 * Threading note:
 *   On native, RNGH callbacks run as UI-thread worklets. Reanimated serialises
 *   captured JS objects at worklet-creation time, so dropBounds / cardPositions
 *   refs captured inside the worklet are stale. The fix: pass only raw
 *   coordinates from the worklet, then read refs inside runOnJS handlers on the
 *   JS thread where refs are always fresh.
 */

import React, { MutableRefObject, useMemo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from './PlayingCard';
import { DropBounds } from '../../hooks/useDrag';
import { TableItem, BuildStack, isBuildStack, TempStack } from '../table/types';

// Card dimensions (normal) - these are the default values
const DEFAULT_CARD_WIDTH = 56;
const DEFAULT_CARD_HEIGHT = 84;

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
  findCardAtPoint: (x: number, y: number) => { id: string; card: Card } | null;
  /** Finds a stack at (x, y); returns null if no stack there */
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  isMyTurn: boolean;
  playerNumber: number;
  /** Player's hand - needed for some UI feedback */
  playerHand?: Card[];
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
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  /** Hide this card when opponent is dragging it (for multiplayer sync) */
  isHidden?: boolean;
  /** Card width for responsive sizing - defaults to 56 */
  cardWidth?: number;
  /** Card height for responsive sizing - defaults to 84 */
  cardHeight?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableHandCard({
  card,
  dropBounds,
  findCardAtPoint,
  findTempStackAtPoint,
  isMyTurn,
  playerNumber,
  playerHand,
  tableCards,
  onDropOnStack,
  onDropOnCard,
  onDropOnTable,
  onDragStart,
  onDragMove,
  onDragEnd,
  isHidden,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
}: Props) {
  const opacity = useSharedValue(1);

  // ── JS-thread helpers ─────────────────────────────────────────────────────

  function handleDragStart(x: number, y: number) { 
    console.log('[DraggableHandCard] ===== HANDLE DRAG START =====');
    console.log('[DraggableHandCard] Card:', card.rank, card.suit);
    console.log('[DraggableHandCard] Position from gesture:', { x, y });
    
    // Pass the actual position to parent - THIS IS CRITICAL
    if (onDragStart) {
      console.log('[DraggableHandCard] Calling onDragStart with position:', { x, y });
      onDragStart(card, x, y);
    } else {
      console.warn('[DraggableHandCard] onDragStart is undefined!');
    }
    
    // Immediately send the first move event with the starting position
    if (onDragMove) {
      console.log('[DraggableHandCard] Calling onDragMove with position:', { x, y });
      onDragMove(x, y);
    } else {
      console.warn('[DraggableHandCard] onDragMove is undefined!');
    }
  }
  
  function handleDragMove(x: number, y: number) { 
    if (onDragMove) onDragMove(x, y); 
  }

  function handleSnapBack() {
    opacity.value = withSpring(1);
    if (onDragEnd) onDragEnd();
  }

  /**
   * Check if coordinates are in the table drop zone
   */
  function inTableZone(absX: number, absY: number, bounds: DropBounds): boolean {
    return (
      absX >= bounds.x &&
      absX <= bounds.x + bounds.width &&
      absY >= bounds.y &&
      absY <= bounds.y + bounds.height
    );
  }

  /**
   * handleDrop — DUMB UI: just detects WHAT was hit
   * SmartRouter decides what action to take
   */
  function handleDrop(absX: number, absY: number) {
    const bounds = dropBounds.current;
    
    // 1. Check for stack hit FIRST (priority)
    const stackHit = findTempStackAtPoint(absX, absY);
    if (stackHit) {
      console.log(
        `[DraggableHandCard] DROP ON STACK — ${card.rank}${card.suit} → stack ${stackHit.stackId} (${stackHit.stackType}) owned by P${stackHit.owner}`
      );
      opacity.value = withSpring(0);  // Hide card while action processes
      if (onDragEnd) onDragEnd();
      onDropOnStack(card, stackHit.stackId, stackHit.owner, stackHit.stackType);
      return;
    }
    
    // 2. Check for specific table card hit
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      console.log(
        `[DraggableHandCard] DROP ON CARD — ${card.rank}${card.suit} → ${targetCardResult.card.rank}${targetCardResult.card.suit}`
      );
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnCard(card, targetCardResult.card);
      return;
    }
    
    // 3. Check if in table zone (trail area)
    const inZone = inTableZone(absX, absY, bounds);
    console.log(
      `[DraggableHandCard] DROP — card: ${card.rank}${card.suit}`,
      `| finger: (${absX.toFixed(1)}, ${absY.toFixed(1)})`,
      `| bounds: x=${bounds.x.toFixed(1)} y=${bounds.y.toFixed(1)} w=${bounds.width.toFixed(1)} h=${bounds.height.toFixed(1)}`,
      `| inZone: ${inZone}`,
    );

    if (inZone) {
      console.log(`[DraggableHandCard] DROP ON TABLE — ${card.rank}${card.suit}`);
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnTable(card);
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

  // ── Gesture ─────────────────────────────────────────────────────────────────

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      console.log('[DraggableHandCard] Gesture onStart - raw event:', {
        absoluteX: e.absoluteX,
        absoluteY: e.absoluteY,
        x: e.x,
        y: e.y
      });
      
      // Call handleDragStart which will store position AND send first move
      runOnJS(handleDragStart)(e.absoluteX, e.absoluteY);
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

  // If hidden (opponent is dragging this card), render hidden view
  // This maintains layout while the card is hidden from opponent
  if (isHidden) {
    return (
      <Animated.View style={{ opacity: 0 }}>
        <PlayingCard rank={card.rank} suit={card.suit} width={cardWidth} height={cardHeight} />
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <PlayingCard rank={card.rank} suit={card.suit} width={cardWidth} height={cardHeight} />
      </Animated.View>
    </GestureDetector>
  );
}

export default DraggableHandCard;
