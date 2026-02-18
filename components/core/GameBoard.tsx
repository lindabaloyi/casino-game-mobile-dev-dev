/**
 * GameBoard — Milestone 1 shell
 * Shows the game state visually (round, hands, table cards).
 * Drag, modals, and action logic will be added in later milestones.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameState } from '../../hooks/useGameState';
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
  onRestart,
  onBackToMenu,
  serverError,
  onServerErrorClose,
}: GameBoardProps) {
  const myHand   = gameState.playerHands?.[playerNumber] ?? [];
  const table    = gameState.tableCards ?? [];
  const isMyTurn = gameState.currentPlayer === playerNumber;

  return (
    <View style={styles.root}>

      {/* ── Server error banner ─────────────────────────── */}
      {serverError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{serverError.message}</Text>
          <Text style={styles.errorClose} onPress={onServerErrorClose}>✕</Text>
        </View>
      )}

      {/* ── Status bar ──────────────────────────────────── */}
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

      {/* ── Table cards ─────────────────────────────────── */}
      <View style={[styles.section, styles.tableSection]}>
        <Text style={styles.sectionLabel}>
          Table ({table.length} cards) · Deck: {gameState.deck.length}
        </Text>
        <View style={styles.cardRow}>
          {table.length === 0
            ? <Text style={styles.emptyText}>Table is empty</Text>
            : table.map((card, i) => (
                <PlayingCard key={i} rank={card.rank} suit={card.suit} />
              ))
          }
        </View>
      </View>

      {/* ── Player hand ─────────────────────────────────── */}
      <View style={[styles.section, styles.handSection]}>
        <Text style={styles.sectionLabel}>Your Hand</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.cardRow}>
            {myHand.map((card, i) => (
              <PlayingCard key={i} rank={card.rank} suit={card.suit} />
            ))}
          </View>
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
    padding: 8,
  },
  errorText: { color: '#fff', flex: 1 },
  errorClose: { color: '#fff', fontSize: 18, paddingHorizontal: 10 },
  // Status
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
  // Sections
  section: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#388E3C',
  },
  tableSection: {
    flex: 1,
    justifyContent: 'center',
  },
  handSection: {
    height: 110,          // 84px card + 10+10 padding + 6 label
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: '#A5D6A7',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: { color: '#81C784', fontStyle: 'italic' },
  // Cards
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default GameBoard;
