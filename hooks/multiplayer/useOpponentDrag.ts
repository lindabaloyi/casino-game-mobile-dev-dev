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
  source: 'hand' | 'table' | 'captured' | 'temp_stack' | 'build_stack';
  isDragging: boolean;
  position: { x: number; y: number };
  card?: Card;
  cardId?: string;
  cards?: Card[];
  stackId?: string;
  targetType?: 'card' | 'stack' | 'temp_stack' | 'build_stack' | 'capture' | 'table';
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
  /** Emit stack drag start event */
  emitDragStackStart: (cards: Card[], stackId: string, source: 'temp_stack' | 'build_stack', position: { x: number; y: number }) => void;
  /** Emit stack drag move event (throttled) */
  emitDragStackMove: (cards: Card[], stackId: string, position: { x: number; y: number }) => void;
  /** Emit stack drag end event */
  emitDragStackEnd: (cards: Card[], stackId: string, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
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
      // Clear opponent drag state IMMEDIATELY when drop is registered
      // No delay - this prevents seeing duplicate cards (ghost + real card)
      setOpponentDrag(null);
    };

    socket.on('opponent-drag-end', handleDragEnd);

    return () => {
      socket.off('opponent-drag-end', handleDragEnd);
    };
  }, [socket]);

  // Handle opponent stack drag start
  useEffect(() => {
    if (!socket) return;

    const handleDragStackStart = (data: {
      playerIndex: number;
      stackId: string;
      cards: Card[];
      source: 'temp_stack' | 'build_stack';
      position: { x: number; y: number };
    }) => {
      console.log('[useOpponentDrag] handleDragStackStart:', data.stackId, 'cards=' + data.cards?.length);
      setOpponentDrag({
        playerIndex: data.playerIndex,
        stackId: data.stackId,
        cards: data.cards,
        source: data.source,
        position: data.position,
        isDragging: true,
      });
    };

    socket.on('opponent-drag-stack-start', handleDragStackStart);

    return () => {
      socket.off('opponent-drag-stack-start', handleDragStackStart);
    };
  }, [socket]);

  // Handle opponent stack drag move
  useEffect(() => {
    if (!socket) return;

    const handleDragStackMove = (data: {
      playerIndex: number;
      stackId: string;
      cards: Card[];
      position: { x: number; y: number };
    }) => {
      console.log('[useOpponentDrag] handleDragStackMove:', 'pos=(' + data.position.x + ',' + data.position.y + ')');
      setOpponentDrag(prev => prev ? {
        ...prev,
        position: data.position,
      } : null);
    };

    socket.on('opponent-drag-stack-move', handleDragStackMove);

    return () => {
      socket.off('opponent-drag-stack-move', handleDragStackMove);
    };
  }, [socket]);

  // Handle opponent stack drag end
  useEffect(() => {
    if (!socket) return;

    const handleDragStackEnd = (data: {
      playerIndex: number;
      stackId: string;
      cards: Card[];
      outcome: 'success' | 'miss' | 'cancelled';
      targetType?: string;
      targetId?: string;
    }) => {
      console.log('[useOpponentDrag] handleDragStackEnd:', data);
      setOpponentDrag(null);
    };

    socket.on('opponent-drag-stack-end', handleDragStackEnd);

    return () => {
      socket.off('opponent-drag-stack-end', handleDragStackEnd);
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

  const emitDragStackStart = useCallback((
    cards: Card[],
    stackId: string,
    source: 'temp_stack' | 'build_stack',
    position: { x: number; y: number }
  ) => {
    console.log('[useOpponentDrag] emitDragStackStart:', { stackId, cardsCount: cards.length, source });
    socket?.emit('drag-stack-start', { cards, stackId, source, position });
  }, [socket]);

  const emitDragStackMove = useCallback(
    throttle((cards: Card[], stackId: string, position: { x: number; y: number }) => {
      socket?.emit('drag-stack-move', { cards, stackId, position });
    }, 16),
    [socket]
  );

  const emitDragStackEnd = useCallback((
    cards: Card[],
    stackId: string,
    outcome: 'success' | 'miss' | 'cancelled',
    targetType?: string,
    targetId?: string
  ) => {
    console.log('[useOpponentDrag] emitDragStackEnd:', { stackId, outcome, targetType, targetId });
    socket?.emit('drag-stack-end', { cards, stackId, outcome, targetType, targetId });
  }, [socket]);

  return {
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
    emitDragStackStart,
    emitDragStackMove,
    emitDragStackEnd,
  };
}

export default useOpponentDrag;
