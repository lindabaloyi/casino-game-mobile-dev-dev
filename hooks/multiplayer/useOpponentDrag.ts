/**
 * useOpponentDrag
 * 
 * Handles real-time opponent drag state for ghost card rendering.
 * 
 * Responsibilities:
 *  - Track opponent's card dragging
 *  - Emit drag events to server
 *  - Listen to opponent drag events from server
 * 
 * Usage:
 *   const { opponentDrag, emitDragStart, emitDragMove, emitDragEnd } = useOpponentDrag(socket);
 */

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { throttle } from '../../utils/throttle';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface OpponentDragState {
  playerIndex: number;
  card: Card;
  cardId: string;
  source: 'hand' | 'table' | 'captured';
  position: { x: number; y: number };
  isDragging: boolean;
  targetType?: 'card' | 'stack' | 'capture' | 'table';
  targetId?: string;
}

export interface UseOpponentDragResult {
  /** Current opponent drag state for ghost card rendering */
  opponentDrag: OpponentDragState | null;
  /** Emit drag start event */
  emitDragStart: (card: Card, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => void;
  /** Emit drag move event (throttled) */
  emitDragMove: (card: Card, position: { x: number; y: number }) => void;
  /** Emit drag end event */
  emitDragEnd: (card: Card, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOpponentDrag(socket: Socket | null): UseOpponentDragResult {
  const [opponentDrag, setOpponentDrag] = useState<OpponentDragState | null>(null);

  // Handle opponent drag start
  useEffect(() => {
    if (!socket) return;

    const handleDragStart = (data: {
      playerIndex: number;
      card: Card;
      cardId: string;
      source: 'hand' | 'table' | 'captured';
      position: { x: number; y: number };
    }) => {
      setOpponentDrag({
        playerIndex: data.playerIndex,
        card: data.card,
        cardId: data.cardId,
        source: data.source,
        position: data.position,
        isDragging: true,
      });
    };

    socket.on('opponent-drag-start', handleDragStart);

    return () => {
      socket.off('opponent-drag-start', handleDragStart);
    };
  }, [socket]);

  // Handle opponent drag move
  useEffect(() => {
    if (!socket) return;

    const handleDragMove = (data: {
      playerIndex: number;
      card: Card;
      position: { x: number; y: number };
    }) => {
      setOpponentDrag(prev => prev ? {
        ...prev,
        position: data.position,
      } : null);
    };

    socket.on('opponent-drag-move', handleDragMove);

    return () => {
      socket.off('opponent-drag-move', handleDragMove);
    };
  }, [socket]);

  // Handle opponent drag end
  useEffect(() => {
    if (!socket) return;

    const handleDragEnd = (data: {
      playerIndex: number;
      card: Card;
      position: { x: number; y: number };
      outcome: 'success' | 'miss' | 'cancelled';
      targetType?: string;
      targetId?: string;
    }) => {
      // Update state with target info for accurate final position
      setOpponentDrag(prev => prev ? {
        ...prev,
        targetType: data.targetType as any,
        targetId: data.targetId,
      } : null);
      
      // Clear opponent drag state after a short delay for animation
      setTimeout(() => {
        setOpponentDrag(null);
      }, 500);
    };

    socket.on('opponent-drag-end', handleDragEnd);

    return () => {
      socket.off('opponent-drag-end', handleDragEnd);
    };
  }, [socket]);

  // ── Emit functions ────────────────────────────────────────────────────────

  const emitDragStart = useCallback((
    card: Card,
    source: 'hand' | 'table' | 'captured',
    position: { x: number; y: number }
  ) => {
    const cardId = `${card.rank}${card.suit}`;
    socket?.emit('drag-start', { card, cardId, source, position });
  }, [socket]);

  // Throttled drag move - limit to ~60fps (16ms)
  const emitDragMove = useCallback(
    throttle((card: Card, position: { x: number; y: number }) => {
      socket?.emit('drag-move', { card, position });
    }, 16),
    [socket]
  );

  const emitDragEnd = useCallback((
    card: Card,
    position: { x: number; y: number },
    outcome: 'success' | 'miss' | 'cancelled',
    targetType?: string,
    targetId?: string
  ) => {
    socket?.emit('drag-end', { card, position, outcome, targetType, targetId });
  }, [socket]);

  return {
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
  };
}

export default useOpponentDrag;
