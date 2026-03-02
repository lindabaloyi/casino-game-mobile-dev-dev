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
  findCardAtPoint:     (x: number, y: number, excludeId?: string) => Card | null;
  findTempStackAtPoint:(x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack'; value?: number } | null;

  // ── DUMB callbacks - just report what was hit ────────────────────────────
  /** Called when dropped on a stack - SmartRouter decides what action */
  onDropOnStack: (card: Card, stackId: string, owner: number, stackType: 'temp_stack' | 'build_stack') => void;
  /** Called when dropped on a card - SmartRouter decides what action */
  onDropOnCard: (card: Card, targetCard: Card) => void;
  
  // Legacy callbacks for ghost overlay
  onDragStart?: (card: Card) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
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
  onDropOnStack,
  onDropOnCard,
  onDragStart,
  onDragMove,
  onDragEnd,
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

export default DraggableLooseCard;
