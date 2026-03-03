/**
 * GameStatusBar
 * Pure display — round number, whose-turn badge, and scores.
 * Zero logic: all data is passed in as props.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  round: number;
  currentPlayer: number;   // 0 or 1 — index of the player whose turn it is
  playerNumber: number;    // which player is viewing this screen
  scores: [number, number];
}

export function GameStatusBar({ round, currentPlayer, playerNumber, scores }: Props) {
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
    paddingHorizontal: 16,
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
});

export default GameStatusBar;
