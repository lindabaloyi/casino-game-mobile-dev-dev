/**
 * GameOverModal
 * Modal displayed when the game ends (after Round 2 for 2-player mode).
 * Shows final scores and winner.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';

interface GameOverModalProps {
  visible: boolean;
  scores: number[];
  playerCount: number;
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
}

export function GameOverModal({
  visible,
  scores,
  playerCount,
  capturedCards,
  tableCardsRemaining,
  deckRemaining,
  onPlayAgain,
  onBackToMenu,
}: GameOverModalProps) {
  const score1 = scores[0] || 0;
  const score2 = scores[1] || 0;
  
  // Determine winner
  const winnerText = score1 > score2 ? 'Player 1' : score2 > score1 ? 'Player 2' : 'Tie';
  
  // Animation
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
    }
  }, [visible, fadeAnim, scaleAnim]);

  const getWinnerText = () => {
    if (winnerText === 'Tie') return "🤝 It's a Tie!";
    return `🎉 ${winnerText} Wins!`;
  };

  const getWinnerColor = () => {
    if (winnerText === 'Player 1') return '#FF5722';
    if (winnerText === 'Player 2') return '#2196F3';
    return '#4CAF50';
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>🏆 Game Over!</Text>

          <View style={styles.scoresSection}>
            <Text style={styles.scoresTitle}>Final Scores</Text>
            
            {playerCount === 2 ? (
              <>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 1:</Text>
                  <Text style={styles.scoreValue}>{score1}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 2:</Text>
                  <Text style={styles.scoreValue}>{score2}</Text>
                </View>
                
                {/* Detailed stats section */}
                {(capturedCards || tableCardsRemaining !== undefined) && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>Round Details</Text>
                    {capturedCards && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>P1 Captured:</Text>
                          <Text style={styles.detailValue}>{capturedCards[0] || 0}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>P2 Captured:</Text>
                          <Text style={styles.detailValue}>{capturedCards[1] || 0}</Text>
                        </View>
                      </>
                    )}
                    {tableCardsRemaining !== undefined && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Table Cards:</Text>
                        <Text style={styles.detailValue}>{tableCardsRemaining}</Text>
                      </View>
                    )}
                    {deckRemaining !== undefined && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Deck Remaining:</Text>
                        <Text style={styles.detailValue}>{deckRemaining}</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.teamLabel}>Team A:</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 1:</Text>
                  <Text style={styles.scoreValue}>{score1}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 2:</Text>
                  <Text style={styles.scoreValue}>{scores[2] || 0}</Text>
                </View>
                <Text style={[styles.teamLabel, { marginTop: 16 }]}>Team B:</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 3:</Text>
                  <Text style={styles.scoreValue}>{scores[2] || 0}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.playerLabel}>Player 4:</Text>
                  <Text style={styles.scoreValue}>{scores[3] || 0}</Text>
                </View>
              </>
            )}
          </View>

          <Text style={[styles.winnerText, { color: getWinnerColor() }]}>
            {getWinnerText()}
          </Text>

          <View style={styles.buttons}>
            {onPlayAgain && (
              <View style={styles.button}>
                <Text style={styles.buttonText} onPress={onPlayAgain}>
                  🎮 Play Again
                </Text>
              </View>
            )}

            {onBackToMenu && (
              <Text style={styles.backButtonText} onPress={onBackToMenu}>
                🏠 Back to Menu
              </Text>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1B5E20',
  },
  scoresSection: {
    width: '100%',
    marginVertical: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  scoresTitle: {
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
  teamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
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
  backButtonText: {
    color: '#424242',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  // New styles for detailed stats
  detailsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
});

export default GameOverModal;
