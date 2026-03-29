/**
 * DisqualifiedPlayerModal
 * Modal displayed when a player is eliminated from a tournament.
 * Shows the player's final tournament statistics and provides
 * a way to return to the lobby.
 * 
 * Visual Design:
 * - Darker overlay than active game screens
 * - Red/warning color scheme to indicate elimination
 * - Clear call-to-action for returning to lobby
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';

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

interface DisqualifiedPlayerModalProps {
  visible: boolean;
  /** The player's index (0-based) */
  playerIndex: number;
  /** Player's total tournament score */
  tournamentScore: number;
  /** Player's final rank in the tournament (1 = winner, higher = worse) */
  finalRank: number;
  /** Total number of players in the tournament */
  totalPlayers: number;
  /** Round when player was eliminated (e.g., "Qualification Round", "Semi-Final") */
  eliminationRound: string;
  /** Player's performance breakdown */
  scoreBreakdown?: PlayerBreakdown;
  /** Number of rounds player survived */
  roundsSurvived: number;
  /** Callback when player clicks "Return to Lobby" */
  onReturnToLobby: () => void;
  /** Optional callback for "Watch Tournament" to observe remaining games */
  onWatchTournament?: () => void;
}

export function DisqualifiedPlayerModal({
  visible,
  playerIndex,
  tournamentScore,
  finalRank,
  totalPlayers,
  eliminationRound,
  scoreBreakdown,
  roundsSurvived,
  onReturnToLobby,
  onWatchTournament,
}: DisqualifiedPlayerModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Get rank suffix (st, nd, rd, th)
  const getRankSuffix = (rank: number): string => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Get performance message based on rank
  const getPerformanceMessage = (): string => {
    if (finalRank === 1) return 'Champion! 🏆';
    if (finalRank === 2) return 'Second Place! 🥈';
    if (finalRank === 3) return 'Third Place! 🥉';
    if (finalRank <= Math.ceil(totalPlayers / 2)) return 'Good Performance!';
    return 'Better Luck Next Time!';
  };

  // Get performance color
  const getPerformanceColor = (): string => {
    if (finalRank === 1) return '#FFD700'; // Gold
    if (finalRank === 2) return '#C0C0C0'; // Silver
    if (finalRank === 3) return '#CD7F32'; // Bronze
    if (finalRank <= Math.ceil(totalPlayers / 2)) return '#28a745'; // Green
    return '#dc3545'; // Red
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          {/* Elimination Header */}
          <View style={styles.header}>
            <Text style={styles.eliminationIcon}>⚠️</Text>
            <Text style={styles.title}>Eliminated</Text>
            <Text style={styles.subtitle}>Tournament Ended</Text>
          </View>

          {/* Player Info */}
          <View style={styles.playerInfo}>
            <Text style={styles.playerLabel}>Player {playerIndex + 1}</Text>
            <View style={[styles.rankBadge, { borderColor: getPerformanceColor() }]}>
              <Text style={[styles.rankText, { color: getPerformanceColor() }]}>
                {finalRank}{getRankSuffix(finalRank)}
              </Text>
            </View>
          </View>

          {/* Performance Message */}
          <Text style={[styles.performanceMessage, { color: getPerformanceColor() }]}>
            {getPerformanceMessage()}
          </Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tournamentScore}</Text>
              <Text style={styles.statLabel}>Total Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{roundsSurvived}</Text>
              <Text style={styles.statLabel}>Rounds Played</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalPlayers}</Text>
              <Text style={styles.statLabel}>Total Players</Text>
            </View>
          </View>

          {/* Elimination Round */}
          <View style={styles.eliminationInfo}>
            <Text style={styles.eliminationLabel}>Eliminated In:</Text>
            <Text style={styles.eliminationRound}>{eliminationRound}</Text>
          </View>

          {/* Score Breakdown (if available) */}
          {scoreBreakdown && (
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Round Statistics</Text>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cards Captured</Text>
                <Text style={styles.breakdownValue}>{scoreBreakdown.totalCards}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spades</Text>
                <Text style={styles.breakdownValue}>{scoreBreakdown.spadeCount}</Text>
              </View>
              
              {scoreBreakdown.tenDiamondPoints > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>10♦ Bonus</Text>
                  <Text style={[styles.breakdownValue, styles.bonusValue]}>+{scoreBreakdown.tenDiamondPoints}</Text>
                </View>
              )}
              
              {scoreBreakdown.twoSpadePoints > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>2♠ Bonus</Text>
                  <Text style={[styles.breakdownValue, styles.bonusValue]}>+{scoreBreakdown.twoSpadePoints}</Text>
                </View>
              )}
              
              {scoreBreakdown.acePoints > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Aces Bonus</Text>
                  <Text style={[styles.breakdownValue, styles.bonusValue]}>+{scoreBreakdown.acePoints}</Text>
                </View>
              )}
              
              {scoreBreakdown.cardCountBonus > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Card Count Bonus</Text>
                  <Text style={[styles.breakdownValue, styles.bonusValue]}>+{scoreBreakdown.cardCountBonus}</Text>
                </View>
              )}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            {onWatchTournament && (
              <TouchableOpacity 
                style={styles.watchButton} 
                onPress={onWatchTournament}
              >
                <Text style={styles.watchButtonText}>Watch Tournament</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.lobbyButton} 
              onPress={onReturnToLobby}
            >
              <Text style={styles.lobbyButtonText}>Return to Lobby</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create<{
  overlay: ViewStyle;
  modal: ViewStyle;
  header: ViewStyle;
  eliminationIcon: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  playerInfo: ViewStyle;
  playerLabel: TextStyle;
  rankBadge: ViewStyle;
  rankText: TextStyle;
  performanceMessage: TextStyle;
  statsGrid: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  eliminationInfo: ViewStyle;
  eliminationLabel: TextStyle;
  eliminationRound: TextStyle;
  breakdownSection: ViewStyle;
  breakdownTitle: TextStyle;
  breakdownRow: ViewStyle;
  breakdownLabel: TextStyle;
  breakdownValue: TextStyle;
  bonusValue: TextStyle;
  buttons: ViewStyle;
  watchButton: ViewStyle;
  watchButtonText: TextStyle;
  lobbyButton: ViewStyle;
  lobbyButtonText: TextStyle;
}>({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker than regular game overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a2e', // Dark blue-black background
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dc3545', // Red border for elimination
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  eliminationIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc3545', // Red for elimination
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  playerLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  performanceMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  eliminationInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    borderRadius: 8,
  },
  eliminationLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  eliminationRound: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  breakdownSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#d1d5db',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bonusValue: {
    color: '#28a745', // Green for bonuses
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  watchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  watchButtonText: {
    color: '#d1d5db',
    fontSize: 15,
    fontWeight: '600',
  },
  lobbyButton: {
    backgroundColor: '#dc3545', // Red primary button
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  lobbyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DisqualifiedPlayerModal;
