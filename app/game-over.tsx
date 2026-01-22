import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameState } from '../multiplayer/server/game-logic/game-state';

interface GameOverScreenProps {
  gameState: GameState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const options = {
  headerShown: false,
};

export default function GameOverScreen({ gameState, onPlayAgain, onBackToMenu }: GameOverScreenProps) {
  // Determine winner and scores
  const winner = gameState.winner;
  const scores = gameState.scores || [0, 0];

  const getWinnerText = () => {
    if (winner === 0) return '🎉 Player 1 Wins!';
    if (winner === 1) return '🎉 Player 2 Wins!';
    return '🤝 Tie Game!';
  };

  const getWinnerColor = () => {
    if (winner === 0) return '#FF5722';
    if (winner === 1) return '#2196F3';
    return '#4CAF50';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Winner Announcement */}
        <View style={styles.winnerSection}>
          <Text style={[styles.winnerText, { color: getWinnerColor() }]}>
            {getWinnerText()}
          </Text>
        </View>

        {/* Scores */}
        <View style={styles.scoresSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.playerLabel}>Player 1:</Text>
            <Text style={styles.scoreText}>{scores[0]} points</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.playerLabel}>Player 2:</Text>
            <Text style={styles.scoreText}>{scores[1]} points</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.playAgainButton]}
            onPress={onPlayAgain}
          >
            <Text style={styles.buttonText}>🎮 Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={onBackToMenu}
          >
            <Text style={styles.buttonText}>🏠 Back to Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20', // Dark casino green
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  winnerSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  scoresSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    minWidth: 280,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buttonSection: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
