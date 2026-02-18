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
 */

import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';

// ── Types ─────────────────────────────────────────────────────────────────────

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
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
// GameBoard owns only the root container + error banner.
// All other styles live inside the sub-components.

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
});

export default GameBoard;
