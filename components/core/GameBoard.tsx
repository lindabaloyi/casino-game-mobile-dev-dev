/**
 * GameBoard — orchestrator
 *
 * Single responsibility: wire data → callbacks → sub-components.
 * No styles, no layout logic, no UI primitives here.
 *
 * Sub-components own their own look:
 *   GameStatusBar   — round / turn / score display
 *   TableArea       — table drop zone + card display
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
// Must match PlayingCard's card dimensions so the ghost is centred on the finger.
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

  // ── Drop zone (absolute-position measurement for gesture hit-testing) ─────
  const { tableRef, dropBounds, onTableLayout } = useDrag();

  // ── Drag overlay state ────────────────────────────────────────────────────
  // draggingCard: React state — only changes at drag start/end (not per frame)
  // overlayX/Y:  Reanimated shared values — updated every gesture frame
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

  // Animated style for the ghost card — runs on the UI thread, zero JS frames
  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: overlayX.value,
    top:  overlayY.value,
  }));

  // ── Action callbacks ──────────────────────────────────────────────────────
  const handleTrail = useCallback(
    (card: { rank: string; suit: string; value: number }) => {
      sendAction({ type: 'trail', payload: { card } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

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
        tableCards={table}
        isMyTurn={isMyTurn}
        tableRef={tableRef}
        onTableLayout={onTableLayout}
      />

      <PlayerHandArea
        hand={myHand}
        isMyTurn={isMyTurn}
        dropBounds={dropBounds}
        onTrail={handleTrail}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/*
        ── Drag ghost overlay ──────────────────────────────────────────────
        Rendered LAST so it naturally paints above every other child.
        position:absolute + full-screen ensures it covers the table area.
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

  // Full-screen overlay — sits above everything because it's the last child
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // No zIndex needed — last-child paint order handles it natively on both platforms
  },
  ghostCard: {
    // Slight scale-up so it looks "lifted"
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
