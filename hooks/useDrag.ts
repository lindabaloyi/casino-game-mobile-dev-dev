/**
 * useDrag
 * Manages the table drop zone and individual card positions for drag interactions.
 *
 * Usage:
 *   const { tableRef, dropBounds, onTableLayout,
 *           registerCard, unregisterCard, findCardAtPoint } = useDrag();
 *
 *   // Table View:
 *   <View ref={tableRef} onLayout={onTableLayout} ...>
 *
 *   // Each table card registers its position:
 *   registerCard('A♠', { x, y, width, height, card })
 *
 *   // On drop, DraggableHandCard checks for a specific card hit first:
 *   const hit = findCardAtPoint(absX, absY);
 *   if (hit) → createTemp action
 *   else → trail action (general table drop)
 */

import { useCallback, useRef } from 'react';
import { View } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  card: { rank: string; suit: string; value: number };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDrag() {
  // ── Table drop zone ───────────────────────────────────────────────────────
  const tableRef   = useRef<View>(null);
  const dropBounds = useRef<DropBounds>({ x: 0, y: 0, width: 0, height: 0 });

  /**
   * Attach to the table View's onLayout.
   *
   * Uses measureInWindow() — NOT measure() — because on Android,
   * measure()'s pageX/pageY are relative to the React Native root view
   * (which excludes the status bar), while Gesture Handler's absoluteX/Y
   * are relative to the full window (including status bar).
   * measureInWindow() uses the same coordinate space as absoluteX/Y on
   * both Android and iOS, so drop-zone hit testing is always accurate.
   */
  const onTableLayout = useCallback(() => {
    tableRef.current?.measureInWindow((x, y, width, height) => {
      dropBounds.current = { x, y, width, height };
      console.log('[useDrag] Table measured (measureInWindow):', { x, y, width, height });
    });
  }, []);

  // ── Individual card positions ─────────────────────────────────────────────
  // Populated by TableArea: each loose table card registers its screen bounds.
  // Read by DraggableHandCard.handleDrop to detect specific-card hits.
  const cardPositions = useRef<Map<string, CardBounds>>(new Map());

  /**
   * Register a table card's absolute screen bounds.
   * Called by TableArea after each card's layout is measured.
   * id = `${rank}${suit}` — unique for a 40-card deck.
   */
  const registerCard = useCallback((id: string, bounds: CardBounds) => {
    cardPositions.current.set(id, bounds);
  }, []);

  /**
   * Remove a card from the position registry (card left the table).
   */
  const unregisterCard = useCallback((id: string) => {
    cardPositions.current.delete(id);
  }, []);

  /**
   * Find a specific table card at the given absolute screen coordinates.
   * Returns the card data if the point falls within a registered card's bounds,
   * otherwise returns null (drop will be treated as a general trail).
   */
  const findCardAtPoint = useCallback(
    (x: number, y: number): { rank: string; suit: string; value: number } | null => {
      for (const [, bounds] of cardPositions.current) {
        if (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        ) {
          return bounds.card;
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
    // Card-level position tracking
    cardPositions,
    registerCard,
    unregisterCard,
    findCardAtPoint,
  };
}

export default useDrag;
