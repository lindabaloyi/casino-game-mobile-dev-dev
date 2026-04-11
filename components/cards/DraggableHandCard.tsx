/**
 * DraggableHandCard
 * A hand card the player can drag to the table.
 *
 * UI is DUMB - just detects WHAT was hit, SmartRouter decides WHAT IT MEANS.
 *
 * Drop detection (JS-thread — never inside a worklet):
 *   1. If the finger lands on a build stack → onDropOnBuildStack(card, stackId, owner, source)
 *   2. If the finger lands on a temp stack → onDropOnTempStack(card, stackId, source)
 *   3. If the finger lands on a loose card area → onDropOnLooseCard(card, source)
 *   4. If the finger lands on a SPECIFIC table card → onDropOnLooseCard(card, targetCard)
 *   5. If the finger lands anywhere on the table → onDropOnTable(card)
 *   6. Otherwise → snap back
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
import { TableItem } from '../table/types';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

// Card dimensions - using shared constants for consistency
const DEFAULT_CARD_WIDTH = CARD_WIDTH; // 56
const DEFAULT_CARD_HEIGHT = CARD_HEIGHT; // 84

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
  /** Called when dropped on a build stack */
  onDropOnBuildStack?: (card: Card, stackId: string, owner: number, source: string) => void;
  /** Called when dropped on a temp stack */
  onDropOnTempStack?: (card: Card, stackId: string, source: string) => void;
  /** Called when dropped on an existing loose card - creates temp stack attached to target */
  onDropOnLooseCard: (card: Card, targetCard: Card) => void;
  /** Called when dropped on table zone - for trail action */
  onDropOnTable: (card: Card) => void;
  // ── Double-tap for createSingleTemp ───────────────────────────────────────
  /** Called when card is double-tapped - for creating single-card temp stack */
  onDoubleTap?: (card: Card) => void;
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
  /** Callback for card contact sound - called when card contacts something */
  onCardContact?: () => void;
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
  onDropOnBuildStack,
  onDropOnTempStack,
  onDropOnLooseCard,
  onDropOnTable,
  onDoubleTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  isHidden,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  onCardContact,
}: Props) {
  const opacity = useSharedValue(1);

  // ── JS-thread helpers ─────────────────────────────────────────────────────

  function handleDragStart(x: number, y: number) { 
    // Pass the actual position to parent
    if (onDragStart) {
      onDragStart(card, x, y);
    }
    
    // Immediately send the first move event with the starting position
    if (onDragMove) {
      onDragMove(x, y);
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
   * Handle double-tap for createSingleTemp action
   */
  function handleDoubleTapCard() {
    if (onDoubleTap && isMyTurn) {
      console.log('[DraggableHandCard] Double-tap detected on', card.rank, card.suit);
      onDoubleTap(card);
    }
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
      opacity.value = withSpring(0);  // Hide card while action processes
      if (onDragEnd) onDragEnd();
      // Play card contact sound when card hits a stack
      console.log('[DraggableHandCard] Card dropped on stack, calling onCardContact');
      if (onCardContact) onCardContact();
      
      // Call specific handler based on stack type
      if (stackHit.stackType === 'build_stack' && onDropOnBuildStack) {
        onDropOnBuildStack(card, stackHit.stackId, stackHit.owner, 'hand');
      } else if (stackHit.stackType === 'temp_stack' && onDropOnTempStack) {
        onDropOnTempStack(card, stackHit.stackId, 'hand');
      }
      return;
    }
    
    // 2. Check for specific table card hit
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      // Play card contact sound when card hits another card
      console.log('[DraggableHandCard] Card dropped on card, calling onCardContact');
      if (onCardContact) onCardContact();
      onDropOnLooseCard(card, targetCardResult.card);
      return;
    }
    
    // 3. Check if in table zone (loose card / trail area)
    const inZone = inTableZone(absX, absY, bounds);

    if (inZone) {
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      // Play card contact sound when card hits the table
      console.log('[DraggableHandCard] Card dropped on table, calling onCardContact');
      if (onCardContact) onCardContact();
      
      // Table zone drop = trail action
      onDropOnTable(card);
    } else {
      handleSnapBack();
    }
  }

  // ── Gesture ─────────────────────────────────────────────────────────────────

  // Double-tap gesture for createSingleTemp action
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(isMyTurn && !!onDoubleTap)
    .onEnd(() => {
      runOnJS(handleDoubleTapCard)();
    });

  // Pan gesture for dragging cards
  const panGesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      opacity.value = 0;
      // Call handleDragStart which will store position AND send first move
      runOnJS(handleDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate(e => {
      runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd(e => {
      // Pass ONLY coordinates to JS thread
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  // Use a Simultaneous gesture to handle both double-tap and pan
  const gesture = Gesture.Race(panGesture, doubleTapGesture);

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
