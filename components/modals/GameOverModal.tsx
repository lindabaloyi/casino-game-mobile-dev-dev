import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed/themed-text';
import { ThemedView } from '../themed/themed-view';

interface GameOverModalProps {
  visible: boolean;
  winner: number;
  scores: [number, number];
  winnerScore: number;
  loserScore: number;
  lastCapturer: number;
  finalCaptures: {
    player0: string[];
    player1: string[];
  };
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}

export function GameOverModal({
  visible,
  winner,
  scores,
  winnerScore,
  loserScore,
  lastCapturer,
  finalCaptures,
  onPlayAgain,
  onReturnToMenu
}: GameOverModalProps) {
  const winnerName = winner === 0 ? 'Player 1' : 'Player 2';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Winner Announcement */}
            <View style={styles.header}>
              <Text style={styles.trophy}>🏆</Text>
              <ThemedText style={styles.winnerTitle}>Game Over!</ThemedText>
              <ThemedText style={styles.winnerName}>{winnerName} Wins!</ThemedText>
            </View>

            {/* Final Scores */}
            <View style={styles.scoresSection}>
              <ThemedText style={styles.sectionTitle}>Final Scores</ThemedText>

              <View style={styles.scoreRow}>
                <ThemedText style={[styles.playerName, winner === 0 && styles.winnerText]}>
                  Player 1
                </ThemedText>
                <ThemedText style={[styles.score, winner === 0 && styles.winnerScore]}>
                  {scores[0]} points
                </ThemedText>
              </View>

              <View style={styles.scoreRow}>
                <ThemedText style={[styles.playerName, winner === 1 && styles.winnerText]}>
                  Player 2
                </ThemedText>
                <ThemedText style={[styles.score, winner === 1 && styles.winnerScore]}>
                  {scores[1]} points
                </ThemedText>
              </View>

              {lastCapturer !== winner && (
                <ThemedText style={styles.tieBreaker}>
                  Tie broken by last capture (Player {lastCapturer + 1})
                </ThemedText>
              )}
            </View>

            {/* Captured Cards Breakdown */}
            <View style={styles.capturesSection}>
              <ThemedText style={styles.sectionTitle}>Captured Cards</ThemedText>

              <View style={styles.playerCaptures}>
                <ThemedText style={styles.captureLabel}>Player 1:</ThemedText>
                <ThemedText style={styles.captureCount}>
                  {finalCaptures.player0.length} cards
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                  <ThemedText style={styles.cardsList}>
                    {finalCaptures.player0.join(', ')}
                  </ThemedText>
                </ScrollView>
              </View>

              <View style={styles.playerCaptures}>
                <ThemedText style={styles.captureLabel}>Player 2:</ThemedText>
                <ThemedText style={styles.captureCount}>
                  {finalCaptures.player1.length} cards
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                  <ThemedText style={styles.cardsList}>
                    {finalCaptures.player1.join(', ')}
                  </ThemedText>
                </ScrollView>
              </View>
            </View>

            {/* Scoring Rules Reminder */}
            <View style={styles.rulesSection}>
              <ThemedText style={styles.rulesTitle}>Scoring Rules:</ThemedText>
              <ThemedText style={styles.ruleItem}>• Aces: 1 point each</ThemedText>
              <ThemedText style={styles.ruleItem}>• 2♠: 1 point</ThemedText>
              <ThemedText style={styles.ruleItem}>• 10♦: 2 points</ThemedText>
              <ThemedText style={styles.ruleItem}>• 6 Spades: +2 bonus</ThemedText>
              <ThemedText style={styles.ruleItem}>• 21+ cards: +2 bonus</ThemedText>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonsSection}>
              <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain}>
                <ThemedText style={styles.playAgainText}>Play Again</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuButton} onPress={onReturnToMenu}>
                <ThemedText style={styles.menuText}>Return to Menu</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trophy: {
    fontSize: 48,
    marginBottom: 8,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  scoresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  winnerText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  winnerScore: {
    color: '#FFD700',
  },
  tieBreaker: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    color: '#CCC',
  },
  capturesSection: {
    marginBottom: 24,
  },
  playerCaptures: {
    marginBottom: 16,
  },
  captureLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  captureCount: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  cardsScroll: {
    maxHeight: 40,
  },
  cardsList: {
    fontSize: 12,
    color: '#CCC',
    lineHeight: 16,
  },
  rulesSection: {
    marginBottom: 24,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ruleItem: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 2,
  },
  buttonsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  playAgainButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  playAgainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  menuText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
