/**
 * RoundEndModal
 * Modal displayed when a round ends.
 * For Round 1: Shows announcement with fade animations, auto-dismisses after 3 seconds.
 * For other rounds: Shows round results, scores, winner, and buttons.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';

interface RoundEndModalProps {
  visible: boolean;
  roundNumber: number;
  endReason?: 'all_cards_played';
  scores: [number, number];
  onNextRound?: () => void;
  onClose?: () => void;
}

export function RoundEndModal({
  visible,
  roundNumber,
  endReason,
  scores,
  onNextRound,
  onClose,
}: RoundEndModalProps) {
  const [score1, score2] = scores;
  const winner = score1 > score2 ? 'Player 1' : score2 > score1 ? 'Player 2' : 'Tie';

  // For Round 1, show animated announcement without buttons
  const isRound1 = roundNumber === 1;

  if (isRound1) {
    return (
      <Round1AnnouncementModal
        visible={visible}
        onDismiss={onClose}
      />
    );
  }

  // For other rounds, show full results with buttons
  const getEndReasonText = () => {
    if (endReason === 'all_cards_played') {
      return 'All cards have been played!';
    }
    return '';
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Round {roundNumber} Complete!</Text>

          <View style={styles.stats}>
            <Text style={styles.statsTitle}>Final Scores</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.playerLabel}>Player 1:</Text>
              <Text style={styles.scoreValue}>{score1}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.playerLabel}>Player 2:</Text>
              <Text style={styles.scoreValue}>{score2}</Text>
            </View>
          </View>

          {endReason && (
            <Text style={styles.endReason}>{getEndReasonText()}</Text>
          )}

          <Text style={styles.winner}>
            {winner === 'Tie'
              ? "It's a tie!"
              : `${winner} wins the round!`}
          </Text>

          <View style={styles.buttons}>
            {onNextRound && (
              <View style={styles.button}>
                <Text style={styles.buttonText} onPress={onNextRound}>Next Round</Text>
              </View>
            )}

            {onClose && (
              <Text style={styles.closeButtonText} onPress={onClose}>Close</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Round 1 Announcement Modal
 * Shows animated announcement and auto-dismisses after 3 seconds
 */
function Round1AnnouncementModal({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss?: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Reset animation values
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          if (onDismiss) {
            onDismiss();
          }
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, scaleAnim, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        <Animated.View
          style={[
            styles.round1Modal,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.round1Title}>Round 1 Complete!</Text>
          <Text style={styles.round1Message}>Get ready for</Text>
          <Text style={styles.round1Announcement}>Round 2</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Round 1 specific styles
  round1Modal: {
    backgroundColor: '#1B5E20',
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    width: '70%',
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  round1Title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  round1Message: {
    fontSize: 16,
    color: '#A5D6A7',
    marginBottom: 8,
  },
  round1Announcement: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Regular modal styles
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1B5E20',
  },
  stats: {
    width: '100%',
    marginVertical: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#424242',
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  playerLabel: {
    fontSize: 18,
    color: '#424242',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  endReason: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  winner: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
    color: '#FF5722',
  },
  buttons: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#424242',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default RoundEndModal;
