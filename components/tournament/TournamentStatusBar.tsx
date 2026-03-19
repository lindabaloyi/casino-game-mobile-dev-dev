/**
 * TournamentStatusBar
 * Displays tournament progress, phase, and player statuses.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '../../hooks/use-theme-color';

interface TournamentStatusBarProps {
  tournamentMode: 'knockout' | null;
  tournamentPhase: string | null;
  tournamentRound: number;
  finalShowdownHandsPlayed: number;
  playerStatuses: { [playerIndex: string]: string };
  tournamentScores: { [playerIndex: string]: number };
  playerCount: number;
}

export function TournamentStatusBar({
  tournamentMode,
  tournamentPhase,
  tournamentRound,
  finalShowdownHandsPlayed,
  playerStatuses,
  tournamentScores,
  playerCount,
}: TournamentStatusBarProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');
  
  // Don't render if not in tournament mode
  if (!tournamentMode || tournamentMode !== 'knockout') {
    return null;
  }
  
  const getPhaseLabel = () => {
    switch (tournamentPhase) {
      case 'QUALIFYING':
        return 'Qualifying Round';
      case 'QUALIFICATION_REVIEW':
        return 'Qualification Review';
      case 'SEMI_FINAL':
        return 'Semi-Final';
      case 'FINAL_SHOWDOWN':
        return `Final Showdown (${finalShowdownHandsPlayed}/2)`;
      case 'COMPLETED':
        return 'Tournament Complete!';
      default:
        return 'Tournament';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#22c55e'; // Green
      case 'ELIMINATED':
        return '#ef4444'; // Red
      case 'SPECTATOR':
        return '#f59e0b'; // Orange
      case 'WINNER':
        return '#fbbf24'; // Gold
      default:
        return '#6b7280'; // Gray
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: accentColor }]}>🏆 Knockout Tournament</Text>
        <Text style={[styles.phase, { color: textColor }]}>{getPhaseLabel()}</Text>
        {tournamentPhase !== 'FINAL_SHOWDOWN' && tournamentPhase !== 'COMPLETED' && (
          <Text style={[styles.round, { color: textColor }]}>Round {tournamentRound}</Text>
        )}
      </View>
      
      <View style={styles.playersRow}>
        {Array.from({ length: playerCount }, (_, i) => (
          <View key={i} style={styles.playerInfo}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(playerStatuses[i] || 'ACTIVE') }
              ]} 
            />
            <Text style={[styles.playerName, { color: textColor }]}>
              P{i + 1}
            </Text>
            <Text style={[styles.playerScore, { color: accentColor }]}>
              {tournamentScores[i] || 0} pts
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phase: {
    fontSize: 14,
    fontWeight: '600',
  },
  round: {
    fontSize: 12,
    marginTop: 2,
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  playerInfo: {
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  playerScore: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default TournamentStatusBar;
