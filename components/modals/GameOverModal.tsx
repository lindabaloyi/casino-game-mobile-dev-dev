/**
 * GameOverModal
 * Modal displayed when the game ends.
 * Shows detailed point breakdown by card type.
 * 
 * KISS Design: Clean typography, minimal borders, adequate spacing.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';

interface ScoreBreakdown {
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

interface GameOverModalProps {
  visible: boolean;
  scores: number[];
  playerCount: number;
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
  scoreBreakdowns?: ScoreBreakdown[];
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
}

export function GameOverModal({
  visible,
  scores,
  playerCount,
  scoreBreakdowns,
  onPlayAgain,
  onBackToMenu,
}: GameOverModalProps) {
  const score1 = scores[0] || 0;
  const score2 = scores[1] || 0;
  
  const winnerText = score1 > score2 ? 'Player 1' : score2 > score1 ? 'Player 2' : 'Tie';
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

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
    if (winnerText === 'Tie') return "It's a Tie!";
    return `${winnerText} Wins!`;
  };

  // Render detailed point breakdown for a player
  const renderBreakdown = (playerIndex: number, playerName: string, score: number) => {
    const bd = scoreBreakdowns?.[playerIndex];
    
    return (
      <View style={styles.playerPanel}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.playerScore}>{score}</Text>
        </View>
        
        {bd && (
          <View style={styles.breakdownContainer}>
            {/* Card Type Breakdown */}
            <Text style={styles.breakdownTitle}>Points From Cards</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>10♦ (2 pts each)</Text>
              <Text style={styles.breakdownValue}>
                {bd.tenDiamondCount > 0 ? `${bd.tenDiamondCount} × 2 = ${bd.tenDiamondPoints}` : '0'}
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>2♠ (1 pt each)</Text>
              <Text style={styles.breakdownValue}>
                {bd.twoSpadeCount > 0 ? `${bd.twoSpadeCount} × 1 = ${bd.twoSpadePoints}` : '0'}
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Aces (1 pt each)</Text>
              <Text style={styles.breakdownValue}>
                {bd.aceCount > 0 ? `${bd.aceCount} × 1 = ${bd.acePoints}` : '0'}
              </Text>
            </View>
            
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Card Points</Text>
              <Text style={styles.totalValue}>{bd.cardPoints}</Text>
            </View>

            {/* Spade Bonus */}
            <View style={styles.bonusSection}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spades ({bd.spadeCount})</Text>
                <Text style={[
                  styles.breakdownValue,
                  bd.spadeBonus > 0 && styles.activeBonus
                ]}>
                  {bd.spadeBonus > 0 ? `+${bd.spadeBonus}` : '0'}
                </Text>
              </View>
              {bd.cardCountBonus > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Cards ({bd.totalCards})</Text>
                  <Text style={[styles.breakdownValue, styles.activeBonus]}>
                    +{bd.cardCountBonus}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>Game Over</Text>

          <View style={styles.scoresSection}>
            <Text style={styles.scoresTitle}>Final Scores</Text>
            
            {playerCount === 2 ? (
              <View style={styles.playersRow}>
                {renderBreakdown(0, 'Player 1', score1)}
                {renderBreakdown(1, 'Player 2', score2)}
              </View>
            ) : (
              <>
                <View style={styles.teamRow}>
                  <Text style={styles.teamLabel}>Team A</Text>
                  <Text style={styles.teamScore}>{score1 + (scores[1] || 0)}</Text>
                </View>
                <View style={styles.teamRow}>
                  <Text style={styles.teamLabel}>Team B</Text>
                  <Text style={styles.teamScore}>{(scores[2] || 0) + (scores[3] || 0)}</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.winnerText}>
            {getWinnerText()}
          </Text>

          <View style={styles.buttons}>
            {onPlayAgain && (
              <View style={styles.button}>
                <Text style={styles.buttonText} onPress={onPlayAgain}>
                  Play Again
                </Text>
              </View>
            )}

            {onBackToMenu && (
              <Text style={styles.backButtonText} onPress={onBackToMenu}>
                Back to Menu
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1B5E20',
    padding: 20,
    borderRadius: 12,
    width: '92%',
    maxWidth: 520,
    maxHeight: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  scoresSection: {
    width: '100%',
    marginVertical: 10,
  },
  scoresTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  playerPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 3,
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
  breakdownContainer: {
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
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
  totalRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bonusSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeBonus: {
    color: '#FFD700',
    fontWeight: '600',
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  teamLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  teamScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 14,
    textAlign: 'center',
    color: '#FFD700',
  },
  buttons: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFD700',
  },
  buttonText: {
    color: '#1B5E20',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default GameOverModal;
