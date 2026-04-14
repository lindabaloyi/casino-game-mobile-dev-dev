/**
 * TeamCard.tsx
 * Renders a team's score card in GameOverModal (Party Mode)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
} from '../../shared/config/gameOverStyles';

interface TeamBreakdown {
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
  players: {
    playerIndex: number;
    totalCards: number;
    spadeCount: number;
    cardPoints: number;
    spadeBonus: number;
    cardCountBonus: number;
    totalScore: number;
  }[];
}

interface TeamCardProps {
  teamName: string;
  team: TeamBreakdown | null;
  teamScore: number;
}

export function TeamCard({ teamName, team, teamScore }: TeamCardProps) {
  if (!team) {
    return null;
  }

  const hasPoints =
    team.tenDiamondPoints > 0 ||
    team.twoSpadePoints > 0 ||
    team.acePoints > 0 ||
    team.spadeBonus > 0 ||
    team.cardCountBonus > 0;

  const isTeamA = teamName === 'Team A';

  return (
    <View style={[styles.teamPanel, isTeamA ? styles.teamPanelTeamA : styles.teamPanelTeamB]}>
      <View style={styles.teamHeader}>
        <Text style={[styles.teamName, isTeamA ? styles.teamNameTeamA : styles.teamNameTeamB]}>
          {teamName}
        </Text>
        <Text style={styles.teamScore}>{teamScore}</Text>
      </View>

      {hasPoints && (
        <View style={styles.pointsContainer}>
          {team.tenDiamondPoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦</Text>
              <Text style={styles.breakdownValue}>{team.tenDiamondPoints} pts</Text>
            </View>
          )}
          {team.twoSpadePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠</Text>
              <Text style={styles.breakdownValue}>{team.twoSpadePoints} pts</Text>
            </View>
          )}
          {team.acePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces</Text>
              <Text style={styles.breakdownValue}>{team.acePoints} pts</Text>
            </View>
          )}
          {team.spadeBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spades ({team.spadeCount})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.spadeBonus}</Text>
            </View>
          )}
          {team.cardCountBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards ({team.totalCards})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.cardCountBonus}</Text>
            </View>
          )}
        </View>
      )}

      {hasPoints && <View style={styles.separator} />}

      <View style={styles.statsContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Cards</Text>
          <Text style={styles.statsValue}>{team.totalCards}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Spades</Text>
          <Text style={styles.statsValue}>{team.spadeCount}</Text>
        </View>
      </View>

      {team.players.length > 0 && (
        <View style={styles.playersSection}>
          <Text style={styles.breakdownTitle}>Contributions</Text>
          {team.players.map((player, idx) => (
            <View key={idx} style={styles.playerContribution}>
              <Text style={styles.playerLabel}>P{player.playerIndex + 1}</Text>
              <Text style={styles.playerPoints}>{player.cardPoints} pts</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create<{
  teamPanel: ViewStyle;
  teamPanelTeamA: ViewStyle;
  teamPanelTeamB: ViewStyle;
  teamHeader: ViewStyle;
  teamName: TextStyle;
  teamNameTeamA: TextStyle;
  teamNameTeamB: TextStyle;
  teamScore: TextStyle;
  pointsContainer: ViewStyle;
  breakdownRow: ViewStyle;
  breakdownLabel: TextStyle;
  breakdownValue: TextStyle;
  activeBonus: TextStyle;
  separator: ViewStyle;
  statsContainer: ViewStyle;
  statsLabel: TextStyle;
  statsValue: TextStyle;
  playersSection: ViewStyle;
  breakdownTitle: TextStyle;
  playerContribution: ViewStyle;
  playerLabel: TextStyle;
  playerPoints: TextStyle;
}>({
  teamPanel: {
    backgroundColor: GAME_OVER_COLORS.panelBackground,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    padding: GAME_OVER_LAYOUT.teamPanelPadding,
    marginBottom: GAME_OVER_LAYOUT.teamPanelMarginBottom,
    minWidth: '42%',
    flex: 1,
    borderWidth: 2,
  },
  teamPanelTeamA: {
    backgroundColor: GAME_OVER_COLORS.teamABackground,
    borderColor: GAME_OVER_COLORS.teamABorder,
  },
  teamPanelTeamB: {
    backgroundColor: GAME_OVER_COLORS.teamBBackground,
    borderColor: GAME_OVER_COLORS.teamBBorder,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GAME_OVER_LAYOUT.teamHeaderMarginBottom,
    paddingBottom: GAME_OVER_LAYOUT.teamHeaderPaddingBottom,
    borderBottomWidth: GAME_OVER_LAYOUT.teamHeaderBorderWidth,
    borderBottomColor: GAME_OVER_COLORS.borderLight,
  },
  teamName: {
    fontSize: GAME_OVER_SIZES.teamNameSize,
    fontWeight: 'bold',
  },
  teamNameTeamA: {
    color: GAME_OVER_COLORS.teamAText,
  },
  teamNameTeamB: {
    color: GAME_OVER_COLORS.teamBText,
  },
  teamScore: {
    fontSize: GAME_OVER_SIZES.teamScoreSize,
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
  playersSection: {
    paddingTop: GAME_OVER_LAYOUT.playersSectionPaddingTop,
    marginTop: GAME_OVER_LAYOUT.playersSectionMarginTop,
    borderTopWidth: GAME_OVER_LAYOUT.playersSectionBorderTopWidth,
    borderTopColor: GAME_OVER_COLORS.separator,
  },
  breakdownTitle: {
    fontSize: GAME_OVER_SIZES.breakdownTitleSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textSecondary,
    marginBottom: 4,
  },
  playerContribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  playerLabel: {
    fontSize: GAME_OVER_SIZES.contributionLabelSize,
    color: GAME_OVER_COLORS.textSecondary,
  },
  playerPoints: {
    fontSize: GAME_OVER_SIZES.contributionValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
});

export default TeamCard;