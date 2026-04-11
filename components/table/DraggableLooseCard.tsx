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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DraggableLooseCardProps {
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

  // Hit detection — forwarded to DraggableTableCard
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number } | null;
  findBuildStackAtPoint:(x: number, y: number) => { stackId: string; owner: number } | null;

  // ── DUMB callbacks - just report what was hit ────────────────────────────
  /** Called when dropped on a build stack */
  onDropOnBuildStack?: (card: Card, stackId: string, owner: number, source: string) => void;
  /** Called when dropped on a temp stack */
  onDropOnTempStack?: (card: Card, stackId: string, source: string) => void;
  /** Called when dropped on a card - SmartRouter decides what action */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  
  // Legacy callbacks for ghost overlay
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  
  // Hide this card (used when opponent is dragging it)
  isHidden?: boolean;
  /** Callback for double-tap to create single temp stack */
  onDoubleTapCard?: (card: Card) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DraggableLooseCard({
  card,
  isMyTurn,
  playerNumber,
  layoutVersion,
  registerCard,
  unregisterCard,
  findCardAtPoint,
  findTempStackAtPoint,
  findBuildStackAtPoint,
  onDropOnBuildStack,
  onDropOnTempStack,
  onDropOnCard,
  onDragStart,
  onDragMove,
  onDragEnd,
  isHidden,
  onDoubleTapCard,
}: DraggableLooseCardProps) {
  const viewRef = useRef<View>(null);
  const cardId  = `${card.rank}${card.suit}`;

  const onLayout = useCallback(() => {
    // RAF ensures the native frame is fully committed before we measure,
    // preventing stale/zero coordinates on first render or after reflow.
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerCard(cardId, { x, y, width, height, card });
      });
    });
  }, [card, cardId, registerCard]);

  // Register immediately on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerCard(cardId, { x, y, width, height, card });
      });
    });
  }, [cardId, card, registerCard]); // Run on mount with card dependencies

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
        findBuildStackAtPoint={findBuildStackAtPoint}
        onDropOnBuildStack={onDropOnBuildStack}
        onDropOnTempStack={onDropOnTempStack}
        onDropOnCard={onDropOnCard}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDoubleTap={onDoubleTapCard}
      />
    </View>
  );
}

export default DraggableLooseCard;
