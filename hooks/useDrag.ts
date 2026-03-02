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
  stackType: 'temp_stack' | 'build_stack';
}

export interface CapturedCardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  card: { rank: string; suit: string; value: number };
}

// Capture pile bounds for player's own capture pile
export interface CapturePileBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  playerIndex: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

// Increased tolerance for better hit detection during drag & drop
const DIRECT_HIT_TOLERANCE = 20;
// Expanded tolerance for proximity check - cards near table items won't trail
const PROXIMITY_TOLERANCE = 35;

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
    console.log('[useDrag] registerCard:', { id, ...bounds });
    cardPositions.current.set(id, bounds);
  }, []);

  const unregisterCard = useCallback((id: string) => {
    cardPositions.current.delete(id);
  }, []);

  /**
   * Returns the loose card at (x, y), or null (direct hit).
   * excludeId — skip this card ID (used by DraggableTableCard to avoid matching itself).
   */
  const findCardAtPoint = useCallback(
    (x: number, y: number, excludeId?: string): { rank: string; suit: string; value: number } | null => {
      // Debug: log all registered cards
      const cardList = Array.from(cardPositions.current.entries()).map(([id, b]) => ({ id, ...b }));
      console.log('[useDrag] findCardAtPoint - checking:', { x, y, excludeId, registeredCards: cardList });
      
      for (const [id, bounds] of cardPositions.current) {
        if (excludeId && id === excludeId) continue;
        const inX = x >= bounds.x - DIRECT_HIT_TOLERANCE && x <= bounds.x + bounds.width + DIRECT_HIT_TOLERANCE;
        const inY = y >= bounds.y - DIRECT_HIT_TOLERANCE && y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE;
        console.log('[useDrag] findCardAtPoint - checking card:', { id, card: bounds.card, x, y, bounds, inX, inY });
        if (inX && inY) {
          console.log('[useDrag] findCardAtPoint - HIT:', { id, bounds, x, y, tolerance: DIRECT_HIT_TOLERANCE });
          return bounds.card;
        }
      }
      console.log('[useDrag] findCardAtPoint - no hit');
      return null;
    },
    [],
  );

  /**
   * Returns true if point is near any table card (proximity check).
   * Used to prevent trailing when card is close to but not directly on a table card.
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
    console.log('[useDrag] registerTempStack:', { stackId, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, owner: bounds.owner });
    tempStackPositions.current.set(stackId, bounds);
  }, []);

  const unregisterTempStack = useCallback((stackId: string) => {
    tempStackPositions.current.delete(stackId);
  }, []);

  /** Returns the temp stack at (x, y), or null (direct hit). */
  const findTempStackAtPoint = useCallback(
    (x: number, y: number): { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null => {
      // Debug: log all registered stacks
      const stackList = Array.from(tempStackPositions.current.entries()).map(([id, b]) => ({ id, ...b }));
      console.log('[useDrag] findTempStackAtPoint - checking:', { x, y, registeredStacks: stackList });
      
      for (const [, bounds] of tempStackPositions.current) {
        const inX = x >= bounds.x - DIRECT_HIT_TOLERANCE && x <= bounds.x + bounds.width + DIRECT_HIT_TOLERANCE;
        const inY = y >= bounds.y - DIRECT_HIT_TOLERANCE && y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE;
        console.log('[useDrag] findTempStackAtPoint - checking stack:', { stackId: bounds.stackId, x, y, bounds, inX, inY });
        if (inX && inY) {
          console.log('[useDrag] findTempStackAtPoint - HIT:', { bounds, x, y, tolerance: DIRECT_HIT_TOLERANCE });
          return { stackId: bounds.stackId, owner: bounds.owner, stackType: bounds.stackType };
        }
      }
      console.log('[useDrag] findTempStackAtPoint - no hit');
      return null;
    },
    [],
  );

  /** Returns true if point is near any temp stack (proximity check). */
  const isNearAnyStack = useCallback(
    (x: number, y: number): boolean => {
      for (const [, bounds] of tempStackPositions.current) {
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

  // ── Captured card position (opponent's top card) ─────────────────────────
  const capturedCardPosition = useRef<CapturedCardBounds | null>(null);

  const registerCapturedCard = useCallback((bounds: CapturedCardBounds) => {
    capturedCardPosition.current = bounds;
  }, []);

  const unregisterCapturedCard = useCallback(() => {
    capturedCardPosition.current = null;
  }, []);

  /** Returns the captured card if point is within its bounds, or null. */
  const findCapturedCardAtPoint = useCallback(
    (x: number, y: number): { rank: string; suit: string; value: number } | null => {
      const bounds = capturedCardPosition.current;
      if (!bounds) return null;
      
      if (
        x >= bounds.x - DIRECT_HIT_TOLERANCE &&
        x <= bounds.x + bounds.width  + DIRECT_HIT_TOLERANCE &&
        y >= bounds.y - DIRECT_HIT_TOLERANCE &&
        y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE
      ) {
        return bounds.card;
      }
      return null;
    },
    [],
  );

  // ── Capture pile position (player's own capture pile) ───────────────────────
  const capturePilePosition = useRef<CapturePileBounds | null>(null);

  const registerCapturePile = useCallback((bounds: CapturePileBounds) => {
    console.log('[useDrag] registerCapturePile:', bounds);
    capturePilePosition.current = bounds;
  }, []);

  const unregisterCapturePile = useCallback(() => {
    capturePilePosition.current = null;
  }, []);

  /** Returns the capture pile bounds if point is within it, or null. */
  const findCapturePileAtPoint = useCallback(
    (x: number, y: number): CapturePileBounds | null => {
      const bounds = capturePilePosition.current;
      if (!bounds) {
        console.log('[useDrag] findCapturePileAtPoint: no bounds registered');
        return null;
      }
      
      const inX = x >= bounds.x - DIRECT_HIT_TOLERANCE && x <= bounds.x + bounds.width + DIRECT_HIT_TOLERANCE;
      const inY = y >= bounds.y - DIRECT_HIT_TOLERANCE && y <= bounds.y + bounds.height + DIRECT_HIT_TOLERANCE;
      
      console.log('[useDrag] findCapturePileAtPoint:', { x, y, bounds, inX, inY });
      
      if (inX && inY) {
        return bounds;
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
    // Temp stack positions
    tempStackPositions,
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
    isNearAnyStack,
    // Captured card position
    capturedCardPosition,
    registerCapturedCard,
    unregisterCapturedCard,
    findCapturedCardAtPoint,
    // Capture pile position
    capturePilePosition,
    registerCapturePile,
    unregisterCapturePile,
    findCapturePileAtPoint,
  };
}

export default useDrag;
