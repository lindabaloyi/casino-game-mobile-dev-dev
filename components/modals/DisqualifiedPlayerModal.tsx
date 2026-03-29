/**
 * DisqualifiedPlayerModal
 * Modal displayed when a player is eliminated from a tournament.
 * Shows the player's final tournament statistics and provides
 * a way to return to the lobby.
 * 
 * Visual Design: Red theme per casino-noir spec (elimination = warning)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { ModalSurface } from './ModalSurface';

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
  playerIndex: number;
  tournamentScore: number;
  finalRank: number;
  totalPlayers: number;
  eliminationRound: string;
  scoreBreakdown?: PlayerBreakdown;
  roundsSurvived: number;
  onReturnToLobby: () => void;
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

  // Get rank suffix
  const getRankSuffix = (rank: number): string => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Get performance color
  const getPerformanceColor = (): string => {
    if (finalRank === 1) return '#FFD700';
    if (finalRank === 2) return '#C0C0C0';
    if (finalRank === 3) return '#CD7F32';
    if (finalRank <= Math.ceil(totalPlayers / 2)) return '#28a745';
    return '#dc3545';
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <ModalSurface
            visible={visible}
            theme="red"
            title="Eliminated"
            subtitle="Tournament Ended"
            onClose={() => {}}
            maxWidth="sm"
          >
            {/* Player info row */}
            <View style={styles.playerRow}>
              <Text style={styles.playerLabel}>Player {playerIndex + 1}</Text>
              <View style={[styles.rankBadge, { borderColor: getPerformanceColor() }]}>
                <Text style={[styles.rankText, { color: getPerformanceColor() }]}>
                  {finalRank}{getRankSuffix(finalRank)}
                </Text>
              </View>
            </View>

            {/* Performance message */}
            <Text style={[styles.perfMessage, { color: getPerformanceColor() }]}>
              {finalRank === 1 ? 'Champion! 🏆' :
               finalRank === 2 ? 'Second Place! 🥈' :
               finalRank === 3 ? 'Third Place! 🥉' :
               finalRank <= Math.ceil(totalPlayers / 2) ? 'Good Performance!' :
               'Better Luck Next Time!'}
            </Text>

            {/* Info box */}
            <View style={styles.infoBox}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Points</Text>
                <Text style={styles.statValue}>{tournamentScore}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Rounds</Text>
                <Text style={styles.statValue}>{roundsSurvived}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Players</Text>
                <Text style={styles.statValue}>{totalPlayers}</Text>
              </View>
            </View>

            {/* Elimination round */}
            <View style={styles.eliminationBox}>
              <Text style={styles.elimLabel}>Eliminated In:</Text>
              <Text style={styles.elimRound}>{eliminationRound}</Text>
            </View>

            {/* Score breakdown */}
            {scoreBreakdown && (
              <View style={styles.breakdownBox}>
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
            {onWatchTournament && (
              <TouchableOpacity style={styles.btnGhost} onPress={onWatchTournament}>
                <Text style={styles.btnGhostText}>Watch Tournament</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnRed} onPress={onReturnToLobby}>
              <Text style={styles.btnText}>Return to Lobby</Text>
            </TouchableOpacity>
          </ModalSurface>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create<{
  overlay: ViewStyle;
  modalWrapper: ViewStyle;
  playerRow: ViewStyle;
  playerLabel: TextStyle;
  rankBadge: ViewStyle;
  rankText: TextStyle;
  perfMessage: TextStyle;
  infoBox: ViewStyle;
  statRow: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;
  eliminationBox: ViewStyle;
  elimLabel: TextStyle;
  elimRound: TextStyle;
  breakdownBox: ViewStyle;
  breakdownTitle: TextStyle;
  breakdownRow: ViewStyle;
  breakdownLabel: TextStyle;
  breakdownValue: TextStyle;
  bonusValue: TextStyle;
  btnGhost: ViewStyle;
  btnGhostText: TextStyle;
  btnRed: ViewStyle;
  btnText: TextStyle;
}>({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '85%',
    maxWidth: 340,
  },

  // Player info
  playerRow: {
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

  // Performance message
  perfMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Info box
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Elimination box
  eliminationBox: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(220,53,69,0.15)',
    borderRadius: 11,
    width: '100%',
  },
  elimLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  elimRound: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
  },

  // Breakdown
  breakdownBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 11,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    textAlign: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bonusValue: {
    color: '#4ade80',
  },

  // Buttons
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginBottom: 7,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b7280',
  },
  btnRed: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#dc3545',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
});

export default DisqualifiedPlayerModal;
