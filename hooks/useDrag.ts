/**
 * useDrag
 * Manages two position registries for drag interactions:
 *
 *   cardPositions      — loose table cards (registered by LooseCardView)
 *   tempStackPositions — temp stacks on the table (registered by TempStackView)
 *
 * Both registries are read on the JS thread inside DraggableHandCard and
 * DraggableTableCard to determine what the dragged card landed on.
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

export interface TempStackBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  stackId: string;
  owner: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDrag() {
  // ── Table drop zone ───────────────────────────────────────────────────────
  const tableRef   = useRef<View>(null);
  const dropBounds = useRef<DropBounds>({ x: 0, y: 0, width: 0, height: 0 });

  /**
   * Attach to the table View's onLayout.
   * Uses measureInWindow() so coordinate space matches Gesture Handler's
   * absoluteX/Y on both Android and iOS.
   */
  const onTableLayout = useCallback(() => {
    tableRef.current?.measureInWindow((x, y, width, height) => {
      dropBounds.current = { x, y, width, height };
      console.log('[useDrag] Table measured:', { x, y, width, height });
    });
  }, []);

  // ── Loose card positions ──────────────────────────────────────────────────
  const cardPositions = useRef<Map<string, CardBounds>>(new Map());

  const registerCard = useCallback((id: string, bounds: CardBounds) => {
    cardPositions.current.set(id, bounds);
  }, []);

  const unregisterCard = useCallback((id: string) => {
    cardPositions.current.delete(id);
  }, []);

  /**
   * Returns the loose card at (x, y), or null.
   * excludeId — skip this card ID (used by DraggableTableCard to avoid matching itself).
   */
  const findCardAtPoint = useCallback(
    (x: number, y: number, excludeId?: string): { rank: string; suit: string; value: number } | null => {
      for (const [id, bounds] of cardPositions.current) {
        if (excludeId && id === excludeId) continue;
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

  // ── Temp stack positions ──────────────────────────────────────────────────
  const tempStackPositions = useRef<Map<string, TempStackBounds>>(new Map());

  const registerTempStack = useCallback((stackId: string, bounds: TempStackBounds) => {
    tempStackPositions.current.set(stackId, bounds);
  }, []);

  const unregisterTempStack = useCallback((stackId: string) => {
    tempStackPositions.current.delete(stackId);
  }, []);

  /** Returns the temp stack at (x, y), or null. */
  const findTempStackAtPoint = useCallback(
    (x: number, y: number): { stackId: string; owner: number } | null => {
      for (const [, bounds] of tempStackPositions.current) {
        if (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        ) {
          return { stackId: bounds.stackId, owner: bounds.owner };
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
    // Temp stack positions
    tempStackPositions,
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
  };
}

export default useDrag;
