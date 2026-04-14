/**
 * TournamentWinnerModal.tsx
 * Compact modal showing when player wins the entire tournament
 * Shows trophy, congratulations, and close button
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';

interface TournamentWinnerModalProps {
  visible: boolean;
  winnerName?: string;
  tournamentScore?: number;
  onClose: () => void;
}

export function TournamentWinnerModal({
  visible,
  winnerName = 'You',
  tournamentScore,
  onClose,
}: TournamentWinnerModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {/* Trophy */}
          <Text style={styles.trophy}>🏆</Text>

          {/* Title */}
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>You Won the Tournament!</Text>

          {/* Winner name */}
          <Text style={styles.winnerName}>{winnerName}</Text>

          {/* Score if provided */}
          {tournamentScore !== undefined && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Final Score</Text>
              <Text style={styles.scoreValue}>{tournamentScore}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create<{
  overlay: ViewStyle;
  modal: ViewStyle;
  closeButton: ViewStyle;
  closeText: TextStyle;
  trophy: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  winnerName: TextStyle;
  scoreContainer: ViewStyle;
  scoreLabel: TextStyle;
  scoreValue: TextStyle;
}>({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: 280,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  closeText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold',
  },
  trophy: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scoreContainer: {
    marginTop: 16,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#888',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});

export default TournamentWinnerModal;