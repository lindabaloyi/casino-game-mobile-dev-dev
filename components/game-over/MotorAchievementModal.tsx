/**
 * MotorAchievementModal.tsx
 * Compact modal shown when player scores 11+ points
 * Shows mini trophy, achievement message, and close button
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';

interface MotorAchievementModalProps {
  visible: boolean;
  score?: number;
  onClose: () => void;
}

export function MotorAchievementModal({
  visible,
  score,
  onClose,
}: MotorAchievementModalProps) {
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

          {/* Mini Trophy */}
          <Text style={styles.trophy}>🏆</Text>

          {/* Title */}
          <Text style={styles.title}>Motor Achievement!</Text>

          {/* Score if provided */}
          {score !== undefined && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>You scored</Text>
              <Text style={styles.scoreValue}>{score} Points!</Text>
            </View>
          )}

          {/* Achievement badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+1 Achievement</Text>
          </View>
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
  scoreContainer: ViewStyle;
  scoreLabel: TextStyle;
  scoreValue: TextStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
}>({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    width: 240,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  closeText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trophy: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
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
    fontSize: 11,
    color: '#888',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 4,
  },
  badge: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
});

export default MotorAchievementModal;