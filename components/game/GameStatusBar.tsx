/**
 * GameStatusBar
 * Pure display — round number, whose-turn badge, scores, and round progress.
 * Zero logic: all data is passed in as props.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  round: number;
  currentPlayer: number;   // 0 or 1 — index of the player whose turn it is
  playerNumber: number;    // which player is viewing this screen
  scores: [number, number];
  movesRemaining?: number;     // Optional: moves remaining in round
  turnsRemaining?: number;     // Optional: turns remaining in round
  cardsRemaining?: [number, number]; // Optional: [player1 cards, player2 cards]
}

export function GameStatusBar({ 
  round, 
  currentPlayer, 
  playerNumber, 
  scores,
  movesRemaining,
  turnsRemaining,
  cardsRemaining,
}: Props) {
  const isMyTurn = currentPlayer === playerNumber;

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Round {round}</Text>

      <View style={[styles.badge, { backgroundColor: isMyTurn ? '#4CAF50' : '#F44336' }]}>
        <Text style={styles.badgeText}>
          {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </Text>
      </View>

      <Text style={styles.text}>{scores[0]} – {scores[1]}</Text>

      {turnsRemaining !== undefined && (
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{turnsRemaining} turns</Text>
        </View>
      )}

      {cardsRemaining !== undefined && (
        <View style={styles.cardsBadge}>
          <Text style={styles.progressText}>P1:{cardsRemaining[0]} P2:{cardsRemaining[1]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  cardsBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});

export default GameStatusBar;
