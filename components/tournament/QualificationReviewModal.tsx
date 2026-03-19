/**
 * QualificationReviewModal
 * Displays qualified players in a single row with simplified score display
 * Shows countdown timer to next phase
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
}

interface QualifiedPlayer {
  playerIndex: number;
  score: ScoreBreakdown;
}

interface QualificationReviewModalProps {
  visible: boolean;
  qualifiedPlayers: QualifiedPlayer[];
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

export function QualificationReviewModal({
  visible,
  qualifiedPlayers,
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

  const getRankEmoji = (rank: number) => {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  };

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
            <Text style={styles.title}>🏆 QUALIFIED! 🏆</Text>
            <Text style={styles.subtitle}>{getSubtitle()} starts in...</Text>
          </View>

          {/* Qualified Players - Single Row */}
          <View style={styles.playersRow}>
            {qualifiedPlayers.map((player) => {
              const points = getNonZeroPoints(player.score);
              
              return (
                <View 
                  key={player.playerIndex} 
                  style={[
                    styles.playerCard,
                    player.score.rank === 1 ? styles.firstPlaceCard : 
                    player.score.rank === 2 ? styles.secondPlaceCard : styles.thirdPlaceCard
                  ]}
                >
                  {/* Rank & Player */}
                  <View style={styles.rankRow}>
                    <Text style={styles.rankEmoji}>
                      {getRankEmoji(player.score.rank || 2)}
                    </Text>
                    <Text style={styles.playerName}>
                      P{player.playerIndex + 1}
                    </Text>
                  </View>

                  {/* Points - Simple Row */}
                  <View style={styles.pointsRow}>
                    {points.map((point, idx) => (
                      <View key={idx} style={styles.pointBadge}>
                        <Text style={styles.pointLabel}>{point.label}</Text>
                        <Text style={styles.pointValue}>{point.value}</Text>
                      </View>
                    ))}
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalLabel}>TOT</Text>
                      <Text style={styles.totalValue}>{player.score.totalPoints}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    maxWidth: 600,
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
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
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
