/**
 * GameStatusBar
 * Pure display — round number, whose-turn badge, scores, and round progress.
 * Zero logic: all data is passed in as props.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TurnTimer } from './TurnTimer';
import { TurnIndicator } from '../ui/TurnIndicator';

interface Props {
  round: number;
  currentPlayer: number;   // 0-3 — index of the player whose turn it is
  playerNumber: number;    // which player is viewing this screen
  playerCount?: number;     // total players (2 or 4)
  scores: [number, number];
  movesRemaining?: number;     // Optional: moves remaining in round
  turnsRemaining?: number;     // Optional: turns remaining in round
  cardsRemaining?: [number, number]; // Optional: [player1 cards, player2 cards]
  // Timer props
  timeRemaining?: number;
  showTimer?: boolean;
  isLowTime?: boolean;
}

export const GameStatusBar = React.memo(function GameStatusBar({ 
  round, 
  currentPlayer, 
  playerNumber,
  playerCount = 2,
  scores,
  movesRemaining,
  turnsRemaining,
  cardsRemaining,
  timeRemaining,
  showTimer = false,
  isLowTime = false,
}: Props) {
  const isMyTurn = currentPlayer === playerNumber;
  const isPartyMode = playerCount === 4;

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Round {round}</Text>

      {/* Turn indicator with team colors */}
      <TurnIndicator
        currentPlayerIndex={currentPlayer}
        playerIndex={playerNumber}
        isPartyMode={isPartyMode}
        playerCount={playerCount}
      />

      {/* Timer - only shown for active player's turn */}
      <TurnTimer 
        timeRemaining={timeRemaining ?? 20} 
        visible={showTimer}
        isLowTime={isLowTime}
      />

      {turnsRemaining !== undefined && (
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{turnsRemaining} turns</Text>
        </View>
      )}
    </View>
  );
});

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
