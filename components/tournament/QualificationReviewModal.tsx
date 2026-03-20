/**
 * QualificationReviewModal
 * Displays all players with their status (Qualified/Knocked Out) during tournament
 * Shows point breakdown in the same unified style as GameOverModal
 * Includes countdown timer to next phase
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';

interface ScoreBreakdown {
  totalPoints: number;
  cardPoints: number;
  tenDiamondPoints: number;
  twoSpadePoints: number;
  acePoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  rank?: number;
  totalCards?: number;
  spadeCount?: number;
}

interface QualifiedPlayer {
  playerIndex: number;
  score: ScoreBreakdown;
}

interface EliminatedPlayer {
  playerIndex: number;
  score: ScoreBreakdown;
}

interface QualificationReviewModalProps {
  visible: boolean;
  qualifiedPlayers: QualifiedPlayer[];
  eliminatedPlayers?: EliminatedPlayer[];
  countdownSeconds: number;
  onCountdownComplete?: () => void;
}

/**
 * Get only non-zero points as a simple array
 */
function getNonZeroPoints(score: ScoreBreakdown): { label: string; value: number }[] {
  const points: { label: string; value: number }[] = [];
  
  if (score.tenDiamondPoints > 0) {
    points.push({ label: '10♦', value: score.tenDiamondPoints });
  }
  if (score.twoSpadePoints > 0) {
    points.push({ label: '2♠', value: score.twoSpadePoints });
  }
  if (score.acePoints > 0) {
    points.push({ label: 'A', value: score.acePoints });
  }
  if (score.spadeBonus > 0) {
    points.push({ label: 'S', value: score.spadeBonus });
  }
  if (score.cardCountBonus > 0) {
    points.push({ label: 'C', value: score.cardCountBonus });
  }
  
  return points;
}

/**
 * Render a single player panel in the GameOverModal style
 */
const renderPlayerPanel = (
  playerIndex: number,
  score: ScoreBreakdown,
  isQualified: boolean,
  isKnockedOut: boolean
) => {
  const hasPoints =
    score.tenDiamondPoints > 0 ||
    score.twoSpadePoints > 0 ||
    score.acePoints > 0 ||
    score.spadeBonus > 0 ||
    score.cardCountBonus > 0;

  return (
    <View key={playerIndex} style={styles.playerPanel}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerName}>P{playerIndex + 1}</Text>
        <Text style={styles.playerScore}>{score.totalPoints}</Text>
      </View>

      {/* Status badges */}
      {isQualified && (
        <View style={styles.qualifiedBadge}>
          <Text style={styles.qualifiedBadgeText}>✓ Qualified</Text>
        </View>
      )}
      {isKnockedOut && (
        <View style={styles.knockedOutBadge}>
          <Text style={styles.knockedOutBadgeText}>✗ Knocked Out</Text>
        </View>
      )}

      {hasPoints && (
        <View style={styles.pointsContainer}>
          {score.tenDiamondPoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦</Text>
              <Text style={styles.breakdownValue}>{score.tenDiamondPoints} pts</Text>
            </View>
          )}
          {score.twoSpadePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠</Text>
              <Text style={styles.breakdownValue}>{score.twoSpadePoints} pts</Text>
            </View>
          )}
          {score.acePoints > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces</Text>
              <Text style={styles.breakdownValue}>{score.acePoints} pts</Text>
            </View>
          )}
          {score.spadeBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Spades ({score.spadeCount || 0})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{score.spadeBonus}</Text>
            </View>
          )}
          {score.cardCountBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards ({score.totalCards || 0})</Text>
              <Text style={[styles.breakdownValue, styles.activeBonus]}>+{score.cardCountBonus}</Text>
            </View>
          )}
        </View>
      )}

      {hasPoints && <View style={styles.separator} />}

      <View style={styles.statsContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Cards</Text>
          <Text style={styles.statsValue}>{score.totalCards || 0}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.statsLabel}>Spades</Text>
          <Text style={styles.statsValue}>{score.spadeCount || 0}</Text>
        </View>
      </View>
    </View>
  );
};

export function QualificationReviewModal({
  visible,
  qualifiedPlayers,
  eliminatedPlayers = [],
  countdownSeconds,
  onCountdownComplete,
}: QualificationReviewModalProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCountdown(countdownSeconds);
      
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, countdownSeconds]);

  useEffect(() => {
    if (!visible) return;
    
    if (countdown <= 0) {
      onCountdownComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, visible, onCountdownComplete]);

  const getCountdownColor = () => {
    if (countdown > 5) return '#4CAF50';
    if (countdown > 2) return '#FFC107';
    return '#F44336';
  };

  const getSubtitle = () => {
    const count = qualifiedPlayers.length;
    if (count <= 2) return 'Final Showdown';
    return 'Semi-Final';
  };

  // Get qualified player indices for status check
  const qualifiedIndices = qualifiedPlayers.map(p => p.playerIndex);
  const eliminatedIndices = eliminatedPlayers.map(p => p.playerIndex);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: opacityAnim }
        ]}
      >
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🏆 TOURNAMENT 🏆</Text>
            <Text style={styles.subtitle}>{getSubtitle()} starts in...</Text>
          </View>

          {/* All Players Grid - Same style as GameOverModal */}
          <View style={styles.playersGrid}>
            {/* Qualified players */}
            {qualifiedPlayers.map((player) =>
              renderPlayerPanel(player.playerIndex, player.score, true, false)
            )}
            {/* Eliminated players */}
            {eliminatedPlayers.map((player) =>
              renderPlayerPanel(player.playerIndex, player.score, false, true)
            )}
          </View>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <View style={[styles.countdownCircle, { borderColor: getCountdownColor() }]}>
              <Text style={[styles.countdownNumber, { color: getCountdownColor() }]}>
                {countdown}
              </Text>
            </View>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    maxWidth: 560,
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  // Grid layout for all players - same as GameOverModal
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  // Player panel - GameOverModal style
  playerPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 3,
    minWidth: '45%',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  // Status badges
  qualifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  qualifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  knockedOutBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  knockedOutBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Points section
  pointsContainer: {
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activeBonus: {
    color: '#FFD700',
    fontWeight: '600',
  },
  // Separator
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 6,
  },
  // Stats section
  statsContainer: {
    marginTop: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Legacy styles (kept for compatibility)
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  playerCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  firstPlaceCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  secondPlaceCard: {
    borderColor: '#C0C0C0',
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
  },
  thirdPlaceCard: {
    borderColor: '#CD7F32',
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankEmoji: {
    fontSize: 20,
    marginRight: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pointBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    margin: 2,
    alignItems: 'center',
  },
  pointLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  pointValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  totalBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    margin: 2,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  countdownCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default QualificationReviewModal;
