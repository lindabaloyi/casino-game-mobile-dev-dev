/**
 * RoundEndModal
 * Modal displayed when a round ends.
 * Shows round results, scores, winner, and allows advancing to next round.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

interface RoundEndModalProps {
  visible: boolean;
  roundNumber: number;
  endReason?: 'all_cards_played';
  scores: [number, number];
  onNextRound: () => void;
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
            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={onNextRound}
            >
              <Text style={styles.buttonText}>Next Round</Text>
            </TouchableOpacity>

            {onClose && (
              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, styles.closeButtonText]}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  },
  nextButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#424242',
  },
});

export default RoundEndModal;
