/**
 * CaptureOrStealModal
 * Shows choice when capturing small opponent build - capture or extend/steal.
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface CaptureOrStealModalProps {
  visible: boolean;
  card: Card;
  buildValue: number;
  buildCards: Card[];
  extendedTarget: number;
  showStealOnly?: boolean;
  onCapture: () => void;
  onExtend: () => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#dc2626';

export function CaptureOrStealModal({
  visible,
  card,
  buildValue,
  buildCards,
  extendedTarget,
  showStealOnly = false,
  onCapture,
  onExtend,
  onCancel,
  onPlayButtonSound,
}: CaptureOrStealModalProps) {
  const handleCapture = () => {
    onPlayButtonSound?.();
    onCapture();
  };

  const handleExtend = () => {
    onPlayButtonSound?.();
    onExtend();
  };

  const handleCancel = () => {
    onPlayButtonSound?.();
    onCancel();
  };

  const newValue = buildValue + card.value;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {showStealOnly ? "Confirm Steal" : "Choose Action"}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <View style={styles.cardsRow}>
              {buildCards.map((c, index) => (
                <PlayingCard
                  key={`build-${index}`}
                  rank={c.rank}
                  suit={c.suit}
                  width={36}
                  height={48}
                />
              ))}

              <Text style={styles.plusSign}>+</Text>

              <PlayingCard
                rank={card.rank}
                suit={card.suit}
                width={36}
                height={48}
              />
            </View>

            {!showStealOnly && (
              <Text style={styles.newValueText}>
                After extend: {newValue}
              </Text>
            )}

            {showStealOnly ? (
              <TouchableOpacity 
                style={styles.btnGreen} 
                onPress={handleExtend}
                activeOpacity={0.82}
              >
                <Text style={styles.btnText}>Confirm Steal</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.btnRed} 
                  onPress={handleCapture}
                  activeOpacity={0.82}
                >
                  <Text style={styles.btnText}>Capture {buildValue}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.btnGreen} 
                  onPress={handleExtend}
                  activeOpacity={0.82}
                >
                  <Text style={styles.btnText}>Steal Build</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.btnGhost} 
              onPress={handleCancel}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    backgroundColor: MODAL_BG,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MODAL_BORDER,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  body: {
    padding: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  plusSign: {
    fontSize: 18,
    fontWeight: '900',
    color: '#c0392b',
    marginHorizontal: 4,
  },
  newValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 16,
    textAlign: 'center',
  },
  btnRed: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    marginBottom: 7,
  },
  btnGreen: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#1e7d3a',
    borderWidth: 1.5,
    borderColor: '#28a745',
    alignItems: 'center',
    marginBottom: 7,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,100,100,0.15)',
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9b5555',
  },
});

export default CaptureOrStealModal;