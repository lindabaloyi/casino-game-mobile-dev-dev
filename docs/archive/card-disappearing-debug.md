# Casino Game - Disappearing Cards Debugging Document

## Overview

This document investigates the issue of cards disappearing during drag operations, specifically focusing on loose cards created through the temporary card creation system. The investigation covers the complete card lifecycle including creation, dragging, position registration, visibility toggling, state management, and cleanup.

---

## 1. Card Lifecycle Flow

### 1.1 Card Creation (Temporary Stack)

**File: `shared/game/actions/createTemp.js`**

```javascript
/**
 * createTemp
 * Creates a temporary stack from hand card + loose table card.
 * NOTE: This does NOT end the turn - player can continue with more actions.
 */

const { cloneState, generateStackId, startPlayerTurn, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createTemp: invalid card payload - missing rank, suit, or value');
  }
  if (!targetCard?.rank || !targetCard?.suit || targetCard?.value === undefined) {
    throw new Error('createTemp: invalid targetCard payload - missing rank, suit, or value');
  }

  const newState = cloneState(state);

  let firstCard = null;
  let firstSource = '';
  let firstCardFoundOnTable = false;
  
  // STEP 1: Find the first card (card being dragged)
  // Check table first, then hand, then captures (own, teammate, opponents)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    // Card found on table - remove it from tableCards array
    [firstCard] = newState.tableCards.splice(tableIdx, 1);
    firstSource = 'table';
    firstCardFoundOnTable = true;
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      // Card found in hand - remove from hand array
      [firstCard] = hand.splice(handIdx, 1);
      firstSource = 'hand';
    } else {
      // Check own captures first
      let ownCaptureIdx = newState.players[playerIndex].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (ownCaptureIdx !== -1) {
        [firstCard] = newState.players[playerIndex].captures.splice(ownCaptureIdx, 1);
        firstSource = 'captured';
      } else if (state.isPartyMode) {
        // Check teammate's captures
        const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
        let teammateCaptureIdx = newState.players[teammateIndex].captures.findIndex(
          c => c.rank === card.rank && c.suit === card.suit,
        );
        if (teammateCaptureIdx !== -1) {
          [firstCard] = newState.players[teammateIndex].captures.splice(teammateCaptureIdx, 1);
          firstSource = 'captured';
        } else {
          // Check ALL opponents' captures
          const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
          for (const oIdx of opponentIndices) {
            const oppCaptureIdx = newState.players[oIdx].captures.findIndex(
              c => c.rank === card.rank && c.suit === card.suit,
            );
            if (oppCaptureIdx !== -1) {
              [firstCard] = newState.players[oIdx].captures.splice(oppCaptureIdx, 1);
              firstSource = 'captured';
              break;
            }
          }
        }
      } else {
        // Duel mode: check single opponent
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentCaptures = newState.players[opponentIndex].captures;
        const captureIdx = opponentCaptures.findIndex(
          c => c.rank === card.rank && c.suit === card.suit,
        );
        if (captureIdx !== -1) {
          [firstCard] = opponentCaptures.splice(captureIdx, 1);
          firstSource = 'captured';
        }
      }
    }
  }
  
  // POTENTIAL ISSUE 1: If firstCard is not found, the function returns original state
  // without any error. This could lead to inconsistent state.
  if (!firstCard) {
    return state;
  }

  // STEP 2: Find the target card on table (where card is being dropped)
  const originalFirstCardIdx = firstCardFoundOnTable ? tableIdx : newState.tableCards.length;
  
  let targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    // POTENTIAL ISSUE 2: If target card is not found, function returns original state
    // But firstCard has already been removed from its source! This causes card loss.
    return state;
  }

  // STEP 3: Calculate insertion position
  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }
  
  // Remove from table if originally found there
  if (firstCardFoundOnTable) {
    newState.tableCards.splice(tableIdx, 1);
    if (tableIdx < insertIdx) {
      insertIdx = insertIdx - 1;
    }
  }
  
  // Re-find target card after potential splice
  const newTargetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  
  // POTENTIAL ISSUE 3: If target card moved or wasn't found, return state
  // But the firstCard has already been removed - potential card loss
  if (newTargetIdx === -1) {
    return state;
  }

  // STEP 4: Remove target card from table
  const [tableCard] = newState.tableCards.splice(newTargetIdx, 1);

  // STEP 5: Create temp stack with cards ordered by value
  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: firstSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: firstSource }];

  const cards = [bottom, top];
  
  // STEP 6: Use the shared build calculator to compute value
  const values = cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  // STEP 7: Add temp stack to table
  newState.tableCards.splice(insertIdx, 0, {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [bottom, top],
    owner: playerIndex,
    value: buildInfo.value,
    base: buildInfo.value,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
  });

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  return newState;
}
```

**⚠️ POTENTIAL RACE CONDITIONS / ISSUES:**

1. **Card Loss on Early Return (Lines 87-89)**: If `firstCard` is not found, the function returns the original `state` without modifications. However, if earlier operations modified `newState`, this could lead to inconsistency.

2. **Card Loss on Target Not Found (Lines 96-98)**: If `targetIdx === -1` (target card not found), the function returns `state`. But by this point, `firstCard` may have already been removed from its source (hand/table/captures), causing the card to disappear.

3. **Card Loss on Target Move (Lines 116-118)**: Similar issue - if `newTargetIdx === -1` after splicing, the card may be lost.

---

### 1.2 Adding Card to Temp Stack

**File: `shared/game/actions/addToTemp.js`**

```javascript
/**
 * addToTemp
 * Player adds a card to their existing temp stack.
 */

const { cloneState } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

function addToTemp(state, payload, playerIndex) {
  const card = payload.card || payload.tableCard || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToTemp: missing card or stackId');
  }

  const newState = cloneState(state);

  // STEP 1: Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];

  let source = 'unknown';
  let cardFound = false;

  // STEP 2: Find and remove the card from its source
  // Priority: table → hand → captures (own → teammate → opponents)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    newState.tableCards.splice(tableIdx, 1);
    source = 'table';
    cardFound = true;
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      hand.splice(handIdx, 1);
      source = 'hand';
      cardFound = true;
    } else {
      // Check own captures first
      let ownCaptureIdx = newState.players[playerIndex].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (ownCaptureIdx !== -1) {
        newState.players[playerIndex].captures.splice(ownCaptureIdx, 1);
        source = 'captured';
        cardFound = true;
      } else {
        // Check teammate's captures (party mode only)
        let teammateCaptured = false;
        if (state.isPartyMode) {
          const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
          const teammateCaptureIdx = newState.players[teammateIndex].captures.findIndex(
            c => c.rank === card.rank && c.suit === card.suit,
          );
          if (teammateCaptureIdx !== -1) {
            newState.players[teammateIndex].captures.splice(teammateCaptureIdx, 1);
            source = 'captured';
            cardFound = true;
            teammateCaptured = true;
          }
        }
        
        // Check opponents' captures
        if (!cardFound && !teammateCaptured) {
          if (state.isPartyMode) {
            // Party mode: check both opponents
            const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
            for (const oIdx of opponentIndices) {
              const oppCaptureIdx = newState.players[oIdx].captures.findIndex(
                c => c.rank === card.rank && c.suit === card.suit,
              );
              if (oppCaptureIdx !== -1) {
                newState.players[oIdx].captures.splice(oppCaptureIdx, 1);
                source = 'captured';
                cardFound = true;
                break;
              }
            }
          } else {
            // Duel mode: check single opponent
            const opponentIndex = playerIndex === 0 ? 1 : 0;
            const opponentCaptures = newState.players[opponentIndex].captures;
            const captureIdx = opponentCaptures.findIndex(
              c => c.rank === card.rank && c.suit === card.suit,
            );
            if (captureIdx !== -1) {
              opponentCaptures.splice(captureIdx, 1);
              source = 'captured';
              cardFound = true;
            }
          }
        }
      }
    }
  }

  // POTENTIAL ISSUE: If card not found in any source, function returns original state
  // But the card is simply not added - this is handled correctly here
  if (!cardFound) {
    return state;
  }

  // STEP 3: Add card to stack
  stack.cards.push({ ...card, source });

  // STEP 4: Recalculate build value using shared calculator
  const values = stack.cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  
  stack.value = buildInfo.value;
  stack.base = buildInfo.value;
  stack.need = buildInfo.need;
  stack.buildType = buildInfo.buildType;

  return newState;
}
```

**⚠️ POTENTIAL ISSUES:**

1. **Card Not Found Handling (Lines 105-107)**: If the card is not found in any source, the function returns the original `state`. This is correct behavior but could mask underlying issues if the card was expected to exist.

---

## 2. Client-Side Drag Handling

### 2.1 Position Registration System

**File: `hooks/useDrag.ts`**

```typescript
/**
 * useDrag
 * Manages position registries for drag interactions:
 *
 *   cardPositions      — loose table cards (registered by LooseCardView)
 *   tempStackPositions — temp stacks on the table (registered by TempStackView)
 *   capturedCardPosition — opponent's captured top card position
 *
 * Registries are read on the JS thread inside DraggableHandCard and
 * DraggableTableCard to determine what the dragged card landed on.
 */

import { useCallback, useRef } from 'react';
import { View } from 'react-native';

// Types
export interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  card: { rank: string; suit: string; value: number };
}

export interface TempStackBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  stackId: string;
  owner: number;
  stackType: 'temp_stack' | 'build_stack';
}

// Constants
const DIRECT_HIT_TOLERANCE = 20;
const PROXIMITY_TOLERANCE = 35;

export function useDrag() {
  // Table drop zone
  const tableRef   = useRef<View>(null);
  const dropBounds = useRef<DropBounds>({ x: 0, y: 0, width: 0, height: 0 });

  // ── Loose card positions ──────────────────────────────────────────────────
  const cardPositions = useRef<Map<string, CardBounds>>(new Map());

  /**
   * Register a card's position in the registry
   * Called by LooseCardItem on layout
   */
  const registerCard = useCallback((id: string, bounds: CardBounds) => {
    cardPositions.current.set(id, bounds);
  }, []);

  /**
   * Unregister a card when it leaves the table
   * Called in cleanup effect when component unmounts
   */
  const unregisterCard = useCallback((id: string) => {
    cardPositions.current.delete(id);
  }, []);

  /**
   * Find card at point - for hit detection during drag
   * excludeId prevents matching the card being dragged
   */
  const findCardAtPoint = useCallback(
    (x: number, y: number, excludeId?: string): { id: string; card: any } | null => {
      console.log(`[useDrag] findCardAtPoint called with (${x}, ${y}), registered cards: ${cardPositions.current.size}`);
      for (const [id, bounds] of cardPositions.current) {
        if (excludeId && id === excludeId) continue;
        const inX = x >= bounds.x - DIRECT_HIT_TOLERANCE && x <= bounds.x + bounds.width + DIRECT_HIT_TOLERANCE;
        const inY = y >= bounds.y - DIRECT_HIT_TOLERANCE && y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE;
        if (inX && inY) {
          console.log(`[useDrag] Found card ${id} at bounds:`, bounds);
          return { id, card: bounds.card };
        }
      }
      return null;
    },
    [],
  );

  /**
   * Check if point is near any card - prevents trailing when close to a card
   */
  const isNearAnyCard = useCallback(
    (x: number, y: number): boolean => {
      for (const [, bounds] of cardPositions.current) {
        if (
          x >= bounds.x - PROXIMITY_TOLERANCE &&
          x <= bounds.x + bounds.width  + PROXIMITY_TOLERANCE &&
          y >= bounds.y - PROXIMITY_TOLERANCE &&
          y <= bounds.y + bounds.height + PROXIMITY_TOLERANCE
        ) {
          return true;
        }
      }
      return false;
    },
    [],
  );

  // ── Temp stack positions ──────────────────────────────────────────────────
  const tempStackPositions = useRef<Map<string, TempStackBounds>>(new Map());

  const registerTempStack = useCallback((stackId: string, bounds: TempStackBounds) => {
    tempStackPositions.current.set(stackId, bounds);
  }, []);

  const unregisterTempStack = useCallback((stackId: string) => {
    tempStackPositions.current.delete(stackId);
  }, []);

  /**
   * Find temp stack at point - for hit detection
   */
  const findTempStackAtPoint = useCallback(
    (x: number, y: number): { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null => {
      console.log(`[useDrag] findTempStackAtPoint called with (${x}, ${y}), registered stacks: ${tempStackPositions.current.size}`);
      for (const [stackId, bounds] of tempStackPositions.current) {
        const inX = x >= bounds.x - DIRECT_HIT_TOLERANCE && x <= bounds.x + bounds.width + DIRECT_HIT_TOLERANCE;
        const inY = y >= bounds.y - DIRECT_HIT_TOLERANCE && y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE;
        console.log(`[useDrag] Checking stack ${stackId}: bounds=(${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height}), inX=${inX}, inY=${inY}`);
        if (inX && inY) {
          return { stackId: bounds.stackId, owner: bounds.owner, stackType: bounds.stackType };
        }
      }
      return null;
    },
    [],
  );

  return {
    // Table drop zone
    tableRef,
    dropBounds,
    onTableLayout,
    // Loose card positions
    cardPositions,
    registerCard,
    unregisterCard,
    findCardAtPoint,
    isNearAnyCard,
    getCardPosition,
    // Temp stack positions
    tempStackPositions,
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
    isNearAnyStack,
    getStackPosition,
    // ... capture pile positions
  };
}
```

**⚠️ POTENTIAL ISSUES:**

1. **Stale Position Data**: Card positions are registered via `measureInWindow` which can become stale when:
   - Cards shift due to flex-wrap reflow
   - Screen orientation changes
   - Component re-renders

2. **Race Condition in Cleanup**: The `unregisterCard` is called in a cleanup effect, but if a new card with the same ID is added before the old one fully unmounts, the position could be lost.

3. **Missing Registration on Fast Updates**: If table cards change rapidly, the position registration might not complete before hit detection runs.

---

### 2.2 Loose Card Component

**File: `components/table/DraggableLooseCard.tsx`**

```typescript
/**
 * DraggableLooseCard
 * Wraps a single loose table card with:
 *   1. Position registration in the useDrag card registry (for hit detection)
 *   2. A Pan gesture (via DraggableTableCard) that allows the current player
 *      to drag the card onto another loose card or their own temp stack.
 *
 * Responsibilities:
 *   - measureInWindow after layout → registerCard
 *   - Cleanup on unmount → unregisterCard
 *   - Render DraggableTableCard (which owns the gesture + opacity animation)
 *
 * UI is DUMB - just passes through callbacks from DraggableTableCard
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { CardBounds } from '../../hooks/useDrag';
import { Card } from './types';
import { DraggableTableCard } from './DraggableTableCard';

interface DraggableLooseCardProps {
  card: Card;
  isMyTurn:     boolean;
  playerNumber: number;
  /**
   * Increments whenever the table card list changes (tableCards.length).
   * Triggers a re-measure so that cards shifted by flex-wrap reflow
   * update their positions in the registry before the next drag.
   */
  layoutVersion: number;

  // Position registry
  registerCard:   (id: string, bounds: CardBounds)     => void;
  unregisterCard: (id: string)                          => void;

  // Hit detection
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack'; value?: number } | null;

  // Callbacks
  onDropOnStack: (card: Card, stackId: string, owner: number, stackType: 'temp_stack' | 'build_stack') => void;
  onDropOnCard: (card: Card, targetCard: Card) => void;
  
  // Legacy callbacks
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  
  // Hide this card (used when opponent is dragging it)
  isHidden?: boolean;
}

export function DraggableLooseCard({
  card,
  isMyTurn,
  playerNumber,
  layoutVersion,
  registerCard,
  unregisterCard,
  findCardAtPoint,
  findTempStackAtPoint,
  onDropOnStack,
  onDropOnCard,
  onDragStart,
  onDragMove,
  onDragEnd,
  isHidden,
}: DraggableLooseCardProps) {
  const viewRef = useRef<View>(null);
  const cardId  = `${card.rank}${card.suit}`;

  // Register position on layout
  const onLayout = useCallback(() => {
    // RAF ensures the native frame is fully committed before we measure,
    // preventing stale/zero coordinates on first render or after reflow.
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerCard(cardId, { x, y, width, height, card });
      });
    });
  }, [card, cardId, registerCard]);

  // Re-measure whenever the table layout changes (cards added/removed → flex reflow).
  // onLayout only fires when THIS card's own box changes; layoutVersion catches sibling shifts.
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerCard(cardId, { x, y, width, height, card });
      });
    });
  }, [layoutVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup: remove this card from the registry when it leaves the table.
  useEffect(() => {
    return () => unregisterCard(cardId);
  }, [cardId, unregisterCard]);

  // If hidden (opponent is dragging this card), return null
  if (isHidden) {
    return null;
  }

  return (
    <View ref={viewRef} onLayout={onLayout}>
      <DraggableTableCard
        card={card}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        onDropOnStack={onDropOnStack}
        onDropOnCard={onDropOnCard}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      />
    </View>
  );
}
```

**⚠️ POTENTIAL ISSUES:**

1. **Hidden Card Returns Null**: When `isHidden` is true, the component returns `null`. This hides the card during opponent drags but could cause issues if:
   - The visibility state is incorrect
   - The card isn't properly unhidden when the opponent's drag ends

2. **Card ID Collision**: The card ID is `${card.rank}${card.suit}`. In a standard deck, each card is unique, but this could be problematic if:
   - Duplicate cards exist (custom deck)
   - Multiple instances of the same card type are rendered

3. **Position Registration Timing**: The useEffect with `layoutVersion` re-registers positions, but there's a timing gap where positions might be inaccurate.

---

### 2.3 Draggable Table Card (Gesture Handling)

**File: `components/table/DraggableTableCard.tsx`**

```typescript
/**
 * DraggableTableCard
 * A loose table card the current player can drag.
 * 
 * UI is DUMB - just detects WHAT was hit, SmartRouter decides WHAT IT MEANS.
 */

import React, { useMemo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';

export function DraggableTableCard({
  card,
  isMyTurn,
  playerNumber,
  findCardAtPoint,
  findTempStackAtPoint,
  onDropOnStack,
  onDropOnCard,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const opacity = useSharedValue(1);
  const cardId = `${card.rank}${card.suit}`;

  // JS-thread handlers
  function handleDrop(absX: number, absY: number) {
    // 1. Check if dropped on a stack
    const stackHit = findTempStackAtPoint(absX, absY);
    if (stackHit) {
      console.log(`[DraggableTableCard] DROP ON STACK — ${cardId} → stack ${stackHit.stackId}`);
      // Set opacity to 0 immediately - card will be removed from table
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnStack(card, stackHit.stackId, stackHit.owner, stackHit.stackType);
      return;
    }

    // 2. Check if dropped on another loose table card (exclude self)
    const cardHit = findCardAtPoint(absX, absY, cardId);
    if (cardHit) {
      console.log(`[DraggableTableCard] DROP ON CARD — ${cardId} → ${cardHit.card.rank}${cardHit.card.suit}`);
      // Set opacity to 0 immediately - card will be removed from table
      opacity.value = withSpring(0);
      if (onDragEnd) onDragEnd();
      onDropOnCard(card, cardHit.card);
      return;
    }

    // 3. Miss — snap back
    console.log(`[DraggableTableCard] MISS — ${cardId} snapping back`);
    handleSnapBack();
  }

  const gesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart(e => {
      // Hide original card when drag starts
      opacity.value = 0;
      runOnJS(_onDragStart)(e.absoluteX, e.absoluteY);
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
```

**⚠️ POTENTIAL ISSUES:**

1. **Immediate Opacity Change**: The card's opacity is set to 0 immediately when dropped on a valid target. If the action fails on the server, the card will remain invisible.

2. **Hit Detection Uses Stale Positions**: The `findCardAtPoint` and `findTempStackAtPoint` functions use positions that might be stale (see Section 2.1).

3. **Missing Error Handling**: If `onDropOnStack` or `onDropOnCard` throws an error, the card remains invisible.

---

## 3. Card Visibility System

**File: `components/table/utils/cardVisibility.ts`**

```typescript
/**
 * Hook for determining if a card should be hidden during opponent's drag
 */
export function useCardVisibility(opponentDrag?: OpponentDragState | null) {
  const isCardHidden = (card: Card): boolean => {
    // Only hide if opponent is dragging AND the card is from the table
    if (!opponentDrag?.isDragging) return false;

    const cardId = `${card.rank}${card.suit}`;
    const isHidden = opponentDrag.source === 'table' && 
                     opponentDrag.cardId === cardId;
    
    if (isHidden) {
      console.log(`[TableArea] Hiding table card ${cardId} - opponent is dragging`);
    }
    
    return isHidden;
  };

  return { isCardHidden };
}
```

**⚠️ POTENTIAL ISSUES:**

1. **Timing Issue**: The visibility is based on `opponentDrag` state. If the opponent's drag ends but the state isn't cleared properly, cards might remain hidden.

2. **Source Mismatch**: Only cards with `source === 'table'` are hidden. If the source is incorrectly tracked, cards won't be hidden during opponent's drag.

---

## 4. Multiplayer State Synchronization

**File: `hooks/multiplayer/useGameStateSync.ts`**

```typescript
/**
 * useGameStateSync
 * Handles game state synchronization from the server.
 */

export function useGameStateSync(socket: Socket | null): UseGameStateSyncResult {
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Handle game-update event
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdate = (state: GameState) => {
      console.log('[useGameStateSync] game-update received, round:', state.round);
      setGameState(state);
    };

    socket.on('game-update', handleGameUpdate);

    return () => {
      socket.off('game-update', handleGameUpdate);
    };
  }, [socket]);

  // Handle errors
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      console.log('[useGameStateSync] error received:', data.message);
      setError(data.message);
      
      // Request sync after error
      setTimeout(() => {
        socket.emit('request-sync');
      }, 100);
    };

    socket.on('error', handleError);

    return () => {
      socket.off('error', handleError);
    };
  }, [socket]);

  // Send action to server
  const sendAction = useCallback((action: { type: string; payload?: Record<string, unknown> }) => {
    socket?.emit('game-action', action);
  }, [socket]);

  return {
    gameState,
    sendAction,
    // ...
  };
}
```

**⚠️ POTENTIAL ISSUES:**

1. **Optimistic UI Without Rollback**: The client sends actions to the server but doesn't update local state optimistically. If there's a network delay, the UI might appear unresponsive.

2. **Error Handling Gap**: If an action fails, the error is displayed but the local state might be out of sync with the server.

3. **Race Condition on Fast Actions**: If the player quickly performs multiple actions, they might be processed out of order.

---

## 5. Action Flow Summary

### 5.1 Create Temp Stack Flow

```
Player drags card from hand → drops on loose table card
         ↓
GameBoard.handleDropOnCard() or onTableCardDropOnCard
         ↓
actions.createTemp(card, targetCard) → sendAction({ type: 'createTemp', payload: {...} })
         ↓
Socket emits 'game-action' to server
         ↓
Server: createTemp.js processes action
         - Removes card from hand/table/captures
         - Removes target card from table
         - Creates temp_stack object with both cards
         - Returns new state
         ↓
Server emits 'game-update' with new state
         ↓
Client receives 'game-update', updates gameState
         ↓
React re-renders with new tableCards
         ↓
LooseCardItem components mount/unmount based on new tableCards array
         ↓
useEffect cleanup: unregisterCard(oldCardId)
         ↓
useEffect mount: registerCard(newCardId)
```

### 5.2 Potential Disappearance Scenarios

1. **Server Error Mid-Action**: Card removed from source but temp stack creation fails
2. **Network Timeout**: Card disappears from UI but server never processes action
3. **State Desync**: Client and server have different views of which cards exist
4. **Rapid Re-renders**: Position registration doesn't complete before next hit detection
5. **Stale Hit Detection**: Card positions are inaccurate, causing wrong card to be targeted

---

## 6. Recommended Debugging Steps

### 6.1 Add Logging to Server Actions

Add console logs at each step in `createTemp.js`:

```javascript
console.log(`[createTemp] Looking for card: ${card.rank}${card.suit}`);
console.log(`[createTemp] Table cards before:`, newState.tableCards.map(c => `${c.rank}${c.suit}`).filter(Boolean));
```

### 6.2 Add Client-Side Validation

Compare client and server card counts:

```typescript
// In useGameStateSync
const prevCardCount = useRef(0);
useEffect(() => {
  if (gameState) {
    const tableCardCount = gameState.tableCards.filter(c => !c.type).length;
    if (Math.abs(tableCardCount - prevCardCount.current) > 1) {
      console.warn('[GameStateSync] Unexpected card count change:', 
        prevCardCount.current, '→', tableCardCount);
    }
    prevCardCount.current = tableCardCount;
  }
}, [gameState]);
```

### 6.3 Add Position Registry Validation

Validate that registered positions match expected cards:

```typescript
// In useDrag
useEffect(() => {
  console.log('[useDrag] Registered cards:', 
    Array.from(cardPositions.current.entries()).map(([id, bounds]) => 
      `${id} at (${bounds.x}, ${bounds.y})`
    )
  );
}, [cardPositions.current.size]);
```

---

## 7. Summary of Issues Found

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| Card loss on early return | `createTemp.js:87-89, 96-98, 116-118` | High | Card removed from source but not added to stack if target not found |
| Stale position data | `useDrag.ts` | Medium | Card positions may not update fast enough for hit detection |
| Immediate opacity change | `DraggableTableCard.tsx:99,109` | Medium | Card becomes invisible immediately on drop, before server confirmation |
| Optimistic UI missing | `useGameStateSync.ts` | Medium | No local state update while waiting for server |
| Hidden card state | `cardVisibility.ts` | Low | Cards might remain hidden if opponent drag state isn't cleared |
| Card ID collision | `DraggableLooseCard.tsx:77` | Low | Same ID for duplicate cards could cause issues |

---

## 8. Fix Recommendations

1. **Implement Rollback on Server Error**: If `createTemp` fails, ensure the card is returned to its original location
2. **Add Transaction Logging**: Track all card movements in a log that can be replayed
3. **Add Position Validation**: Verify positions are updated after every table change
4. **Improve Error Handling**: Add retry logic for failed actions
5. **Add Card Count Validation**: Verify total cards (hand + table + captures) remains constant
