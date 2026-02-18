/**
 * GameBoard — Milestone 2
 * Players can drag hand cards to the table to trail.
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { DraggableHandCard } from '../cards/DraggableHandCard';
import { PlayingCard } from '../cards/PlayingCard';

// ── Props ──────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
}

// ── GameBoard ──────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  serverError,
  onServerErrorClose,
}: GameBoardProps) {
  const myHand   = gameState.playerHands?.[playerNumber] ?? [];
  const table    = gameState.tableCards ?? [];
  const isMyTurn = gameState.currentPlayer === playerNumber;

  // Drop zone management — measures the table area in absolute screen coords
  const { tableRef, dropBounds, onTableLayout } = useDrag();

  // Trail callback — sends the action to the server
  const handleTrail = useCallback(
    (card: { rank: string; suit: string; value: number }) => {
      sendAction({
        type: 'trail',
        payload: { card } as unknown as Record<string, unknown>,
      });
    },
    [sendAction],
  );

  return (
    <View style={styles.root}>

      {/* ── Server error banner ───────────────────────── */}
      {serverError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{serverError.message}</Text>
          <Text style={styles.errorClose} onPress={onServerErrorClose}>✕</Text>
        </View>
      )}

      {/* ── Status bar ────────────────────────────────── */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Round {gameState.round}</Text>
        <View style={[styles.turnBadge, { backgroundColor: isMyTurn ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.turnBadgeText}>
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </Text>
        </View>
        <Text style={styles.statusText}>
          {gameState.scores[0]} – {gameState.scores[1]}
        </Text>
      </View>

      {/* ── Table drop zone ───────────────────────────── */}
      <View
        ref={tableRef}
        style={[styles.tableSection, isMyTurn && styles.tableSectionActive]}
        onLayout={onTableLayout}
      >
        {/* Drop hint when it's player's turn and table is empty */}
        {isMyTurn && table.length === 0 && (
          <View style={styles.dropHint}>
            <Text style={styles.dropHintText}>Drop a card here to trail</Text>
          </View>
        )}

        <View style={styles.cardRow}>
          {table.map((card, i) => (
            <PlayingCard key={`${card.rank}${card.suit}-${i}`} rank={card.rank} suit={card.suit} />
          ))}
        </View>
      </View>

      {/* ── Player hand ───────────────────────────────── */}
      {/* overflow:visible so dragged cards can travel above the table */}
      <View style={[styles.handSection, { overflow: 'visible' }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          style={{ overflow: 'visible' }}
          contentContainerStyle={[styles.cardRow, { overflow: 'visible' }]}
        >
          {myHand.map((card) => (
            <DraggableHandCard
              key={`${card.rank}${card.suit}`}
              card={card}
              dropBounds={dropBounds}
              isMyTurn={isMyTurn}
              onTrail={handleTrail}
            />
          ))}
        </ScrollView>
      </View>

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  // Error
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

  // Status bar
  statusBar: {
    height: 44,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  turnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  turnBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Table
  tableSection: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    margin: 8,
    borderRadius: 12,
  },
  tableSectionActive: {
    borderColor: '#66BB6A',          // green glow border when it's your turn
    borderStyle: 'dashed',
  },
  dropHint: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  dropHintText: {
    color: '#81C784',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },

  // Hand — only the top half of each card is visible; the rest hangs off-screen
  handSection: {
    height: 65,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#388E3C',
  },
  sectionLabel: {
    color: '#A5D6A7',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default GameBoard;
