/**
 * GameBoard — orchestrator
 *
 * Single responsibility: wire data → callbacks → sub-components.
 * No styles, no layout logic, no UI primitives here.
 *
 * Sub-components own their own look:
 *   GameStatusBar   — round / turn / score display
 *   TableArea       — table drop zone + card display (loose cards + temp stacks)
 *   PlayerHandArea  — scrollable draggable hand
 *
 * Drag-overlay pattern
 * ────────────────────
 * React Native's ScrollView cannot have overflow:visible, so a dragged card
 * rendered inside it will always be clipped by the ScrollView boundary.
 * To fix this we use a "portal" pattern:
 *   1. When drag starts, DraggableHandCard hides itself (opacity → 0).
 *   2. GameBoard receives onDragStart/Move/End callbacks and renders a ghost
 *      PlayingCard in a full-screen absolutely-positioned overlay — the LAST
 *      child of the root, so it always paints above everything else.
 *   3. The ghost follows the finger via Reanimated shared values (no React
 *      state updates, no re-renders per frame).
 *
 * Temp stack creation
 * ───────────────────
 * When a player drops their hand card onto a specific table card, TableArea
 * has already registered that card's screen bounds via useDrag.registerCard.
 * DraggableHandCard calls onCardDrop(handCard, targetCard) which triggers
 * the createTemp server action — grouping the two cards into a temp_stack
 * in tableCards without advancing the turn.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { GameState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { PlayingCard } from '../cards/PlayingCard';

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_WIDTH  = 56;
const CARD_HEIGHT = 84;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  serverError,
  onServerErrorClose,
}: GameBoardProps) {
  // ── Derived data ──────────────────────────────────────────────────────────
  const myHand   = gameState.playerHands?.[playerNumber] ?? [];
  const table    = gameState.tableCards ?? [];
  const isMyTurn = gameState.currentPlayer === playerNumber;

  // ── Drop zone + card position tracking ───────────────────────────────────
  const {
    tableRef,
    dropBounds,
    onTableLayout,
    registerCard,
    unregisterCard,
    findCardAtPoint,
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
  } = useDrag();

  // ── Drag overlay state ────────────────────────────────────────────────────
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  const handleDragStart = useCallback((card: Card) => {
    setDraggingCard(card);
  }, []);

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      overlayX.value = absoluteX - CARD_WIDTH  / 2;
      overlayY.value = absoluteY - CARD_HEIGHT / 2;
    },
    [overlayX, overlayY],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingCard(null);
  }, []);

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: overlayX.value,
    top:  overlayY.value,
  }));

  // ── Action callbacks ──────────────────────────────────────────────────────

  /** Trail: hand card dropped anywhere on the table */
  const handleTrail = useCallback(
    (card: Card) => {
      sendAction({ type: 'trail', payload: { card } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /**
   * Hand card dropped onto a specific table card → createTemp.
   */
  const handleCardDrop = useCallback(
    (handCard: Card, targetCard: Card) => {
      console.log(`[GameBoard] createTemp: ${handCard.rank}${handCard.suit} → ${targetCard.rank}${targetCard.suit}`);
      sendAction({ type: 'createTemp', payload: { card: handCard, targetCard } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /** Table card dropped onto another loose table card → createTempFromTable */
  const handleTableCardDropOnCard = useCallback(
    (card: Card, targetCard: Card) => {
      console.log(`[GameBoard] createTempFromTable: ${card.rank}${card.suit} → ${targetCard.rank}${targetCard.suit}`);
      sendAction({ type: 'createTempFromTable', payload: { card, targetCard } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /** Table card dropped onto own temp stack → addToTemp */
  const handleTableCardDropOnTemp = useCallback(
    (tableCard: Card, stackId: string) => {
      console.log(`[GameBoard] addToTemp: ${tableCard.rank}${tableCard.suit} → stack ${stackId}`);
      sendAction({ type: 'addToTemp', payload: { tableCard, stackId } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /** Accept the pending temp stack → turn advances to opponent */
  const handleAcceptTemp = useCallback(
    (stackId: string) => {
      console.log(`[GameBoard] acceptTemp: ${stackId}`);
      sendAction({ type: 'acceptTemp', payload: { stackId } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /** Cancel the pending temp stack → cards returned, same player's turn */
  const handleCancelTemp = useCallback(
    (stackId: string) => {
      console.log(`[GameBoard] cancelTemp: ${stackId}`);
      sendAction({ type: 'cancelTemp', payload: { stackId } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  /**
   * Compute which temp stack (if any) should show the Accept/Cancel overlay.
   * Only show on the current player's own temp stack, and only on their turn.
   */
  const overlayStackId: string | null = (() => {
    if (!isMyTurn) return null;
    const myTemp = (table as any[]).find(
      (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber,
    );
    return myTemp?.stackId ?? null;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Optional server-error banner */}
      {serverError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{serverError.message}</Text>
          <Text style={styles.errorClose} onPress={onServerErrorClose}>✕</Text>
        </View>
      )}

      <GameStatusBar
        round={gameState.round}
        currentPlayer={gameState.currentPlayer}
        playerNumber={playerNumber}
        scores={gameState.scores as [number, number]}
      />

      <TableArea
        tableCards={table as any}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        tableRef={tableRef}
        onTableLayout={onTableLayout}
        registerCard={registerCard}
        unregisterCard={unregisterCard}
        registerTempStack={registerTempStack}
        unregisterTempStack={unregisterTempStack}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        onTableCardDropOnCard={handleTableCardDropOnCard}
        onTableCardDropOnTemp={handleTableCardDropOnTemp}
        onTableDragStart={handleDragStart}
        onTableDragMove={handleDragMove}
        onTableDragEnd={handleDragEnd}
        overlayStackId={overlayStackId}
        onAcceptTemp={handleAcceptTemp}
        onCancelTemp={handleCancelTemp}
      />

      <PlayerHandArea
        hand={myHand}
        isMyTurn={isMyTurn}
        dropBounds={dropBounds}
        findCardAtPoint={findCardAtPoint}
        onTrail={handleTrail}
        onCardDrop={handleCardDrop}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/*
        ── Drag ghost overlay ──────────────────────────────────────────────
        Rendered LAST so it naturally paints above every other child.
        pointerEvents="none" so it never intercepts gestures.
      */}
      {draggingCard && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Animated.View style={ghostStyle}>
            <PlayingCard
              rank={draggingCard.rank}
              suit={draggingCard.suit}
              style={styles.ghostCard}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  errorBanner: {
    backgroundColor: '#B71C1C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorText:  { color: '#fff', flex: 1, fontSize: 13 },
  errorClose: { color: '#fff', fontSize: 18, paddingHorizontal: 8 },

  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ghostCard: {
    transform: [{ scale: 1.15 }],
    opacity: 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },
});

export default GameBoard;
