/**
 * ShiyaRecallModal
 * Appears when a teammate captures a build on which the current player activated Shiya.
 * Offers Recall (calls recallBuild) or Leave options.
 * Auto-dismisses after specified duration.
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ShiyaBuildEntry {
  value: number;
  cards: Array<{ rank: string; suit: string; value: number }>;
  stackId: string;
  shiyaPlayer?: number;
}

interface ShiyaRecallModalProps {
  visible: boolean;
  build: ShiyaBuildEntry | null;
  onRecall: () => void;
  onClose: () => void;
  autoCloseMs?: number;
}

export function ShiyaRecallModal({
  visible,
  build,
  onRecall,
  onClose,
  autoCloseMs = 4000,
}: ShiyaRecallModalProps) {
  const [timeLeft, setTimeLeft] = useState(Math.ceil(autoCloseMs / 1000));

  useEffect(() => {
    if (!visible) return;
    
    setTimeLeft(Math.ceil(autoCloseMs / 1000));
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, autoCloseMs]);

  if (!build) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Recall Shiya Build?</Text>
          <Text style={styles.timer}>Auto-closes in {timeLeft}s</Text>

          <View style={styles.buildInfo}>
            <Text style={styles.label}>Build cards:</Text>
            <View style={styles.cardRow}>
              {build.cards?.map((card, idx) => (
                <Text key={idx} style={styles.card}>
                  {card.rank}
                  <Text style={styles.suit}>{card.suit}</Text>
                </Text>
              ))}
            </View>
            <Text style={styles.value}>Value: {build.value}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.recallButton]}
              onPress={onRecall}
            >
              <Text style={styles.buttonText}>Recall</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.leaveButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  modal: {
    backgroundColor: '#2C3E50',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1C40F',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ECF0F1',
    marginBottom: 8,
    textAlign: 'center',
  },
  timer: {
    fontSize: 14,
    color: '#BDC3C7',
    marginBottom: 16,
  },
  buildInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#BDC3C7',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  card: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ECF0F1',
    marginHorizontal: 4,
  },
  suit: {
    fontSize: 18,
  },
  value: {
    fontSize: 18,
    color: '#F1C40F',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  recallButton: {
    backgroundColor: '#27AE60',
  },
  leaveButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShiyaRecallModal;
