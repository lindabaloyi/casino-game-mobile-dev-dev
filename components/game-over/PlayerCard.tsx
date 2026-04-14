/**
 * PlayerCard.tsx
 * Renders a single player's score card in GameOverModal
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
} from '../../shared/config/gameOverStyles';

interface PlayerBreakdown {
  totalCards: number;
  spadeCount: number;
  cardPoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  totalScore: number;
  tenDiamondCount: number;
  tenDiamondPoints: number;
  twoSpadeCount: number;
  twoSpadePoints: number;
  aceCount: number;
  acePoints: number;
}

interface PlayerCardProps {
  playerIndex: number;
  playerName: string;
  score: number;
  breakdown?: PlayerBreakdown;
}

export function PlayerCard({ playerIndex, playerName, score, breakdown }: PlayerCardProps) {
  const bd = breakdown;

  if (!bd) {
    return (
      <View style={styles.playerPanel}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.playerScore}>{score}</Text>
        </View>
      </View>
    );
  }

  const hasPoints =
    bd.tenDiamondPoints > 0 ||
    bd.twoSpadePoints > 0 ||
    bd.acePoints > 0 ||
    bd.spadeBonus > 0 ||
    bd.cardCountBonus > 0;

  return (
    <View style={styles.playerPanel}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerName}>{playerName}</Text>
        <Text style={styles.playerScore}>{score}</Text>
      </View>

      {hasPoints && (
        <View style={styles.pointsContainer}>
          {bd.tenDiamondPoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦</Text>
              <Text style={styles.breakdownValue}>{bd.tenDiamondPoints} pts</Text>
            </View>
          )}
          {bd.twoSpadePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠</Text>
              <Text style={styles.breakdownValue}>{bd.twoSpadePoints} pts</Text>
            </View>
          )}
          {bd.acePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces</Text>
              <Text style={styles.breakdownValue}>{bd.acePoints} pts</Text>
            </View>
          )}
          {bd.spadeBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spades ({bd.spadeCount})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.spadeBonus}</Text>
            </View>
          )}
          {bd.cardCountBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards ({bd.totalCards})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.cardCountBonus}</Text>
            </View>
          )}
        </View>
      )}

      {hasPoints && <View style={styles.separator} />}

      <View style={styles.statsContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Cards</Text>
          <Text style={styles.statsValue}>{bd.totalCards}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Spades</Text>
          <Text style={styles.statsValue}>{bd.spadeCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create<{
  playerPanel: ViewStyle;
  playerHeader: ViewStyle;
  playerName: TextStyle;
  playerScore: TextStyle;
  pointsContainer: ViewStyle;
  breakdownRow: ViewStyle;
  breakdownLabel: TextStyle;
  breakdownValue: TextStyle;
  activeBonus: TextStyle;
  separator: ViewStyle;
  statsContainer: ViewStyle;
  statsLabel: TextStyle;
  statsValue: TextStyle;
}>({
  playerPanel: {
    flex: 1,
    backgroundColor: GAME_OVER_COLORS.panelBackground,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    padding: GAME_OVER_LAYOUT.panelPadding,
    marginHorizontal: GAME_OVER_LAYOUT.panelMarginHorizontal,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GAME_OVER_LAYOUT.playerHeaderMarginBottom,
    paddingBottom: GAME_OVER_LAYOUT.playerHeaderPaddingBottom,
    borderBottomWidth: GAME_OVER_LAYOUT.playerHeaderBorderWidth,
    borderBottomColor: GAME_OVER_COLORS.borderLight,
  },
  playerName: {
    fontSize: GAME_OVER_SIZES.playerNameSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textPrimary,
  },
  playerScore: {
    fontSize: GAME_OVER_SIZES.playerScoreSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.gold,
  },
  pointsContainer: {
    marginBottom: GAME_OVER_LAYOUT.pointsContainerMarginBottom,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: GAME_OVER_LAYOUT.breakdownRowPaddingVertical,
  },
  breakdownLabel: {
    fontSize: GAME_OVER_SIZES.labelSize,
    color: GAME_OVER_COLORS.textTertiary,
  },
  breakdownValue: {
    fontSize: GAME_OVER_SIZES.breakdownValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
  activeBonus: {
    color: GAME_OVER_COLORS.activeBonus,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: GAME_OVER_COLORS.separator,
    marginVertical: GAME_OVER_LAYOUT.separatorMarginVertical,
  },
  statsContainer: {
    marginTop: GAME_OVER_LAYOUT.statsContainerMarginTop,
  },
  statsLabel: {
    fontSize: GAME_OVER_SIZES.statsLabelSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textPrimary,
  },
  statsValue: {
    fontSize: GAME_OVER_SIZES.statsValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
});

export default PlayerCard;