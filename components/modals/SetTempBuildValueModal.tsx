/**
 * SetTempBuildValueModal
 * Modal for setting the base value on a temp stack (dual build).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface SetTempBuildValueModalProps {
  visible: boolean;
  tempStack: {
    stackId: string;
    cards: Card[];
    value: number;
    owner: number;
  };
  playerNumber: number;
  playerCount?: number;
  isPartyMode?: boolean;
  availableValues?: number[];
  onConfirm: (value: number) => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#7c3aed';

export function SetTempBuildValueModal({
  visible,
  tempStack,
  playerNumber,
  playerCount = 2,
  isPartyMode = false,
  availableValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: SetTempBuildValueModalProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedValue(null);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  const handleConfirm = () => {
    if (selectedValue === null) return;
    onPlayButtonSound?.();
    onConfirm(selectedValue);
  };

  const handleValuePress = (value: number) => {
    setSelectedValue(value);
  };

  const handleCancel = () => {
    onCancel();
  };

  const stackCards = tempStack?.cards || [];
  const currentValue = tempStack?.value || 0;

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
            <Text style={styles.title}>Set Build Value</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <View style={styles.cardsRow}>
              {stackCards.map((card, index) => (
                <PlayingCard
                  key={`stack-${index}`}
                  rank={card.rank}
                  suit={card.suit}
                  width={36}
                  height={48}
                />
              ))}
            </View>

            <Text style={styles.currentValueText}>
              Current combined value: {currentValue}
            </Text>

            <Text style={styles.selectPrompt}>Select target value:</Text>
            
            <View style={styles.valuesGrid}>
              {availableValues.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.valueButton,
                    selectedValue === value && styles.valueButtonSelected,
                  ]}
                  onPress={() => handleValuePress(value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.valueButtonText,
                      selectedValue === value && styles.valueButtonTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedValue !== null ? (
              <Animated.View style={[styles.glowWrapper, { opacity: glowOpacity }]}>
                <TouchableOpacity
                  style={[styles.btnDynamic, styles.btnDynamicPurple]}
                  onPress={handleConfirm}
                  activeOpacity={0.82}
                >
                  <Text style={styles.btnText}>Set Value to {selectedValue}</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={[styles.glowWrapper, { opacity: 0.4 }]}>
                <TouchableOpacity
                  style={[styles.btnDynamic, styles.btnDynamicDisabled]}
                  activeOpacity={1}
                >
                  <Text style={styles.btnTextDisabled}>Select a Value</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.btnGhost} onPress={handleCancel}>
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
    marginBottom: 12,
    gap: 4,
  },
  currentValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
    marginBottom: 10,
    textAlign: 'center',
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  valueButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueButtonSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  valueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#a78bfa',
  },
  valueButtonTextSelected: {
    color: '#ffffff',
  },
  glowWrapper: {
    width: '100%',
    marginBottom: 7,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 13,
  },
  btnDynamic: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnDynamicPurple: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  btnDynamicDisabled: {
    backgroundColor: '#4c1d95',
    borderColor: '#6b21a8',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  btnTextDisabled: {
    fontSize: 16,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 0.4,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
    marginTop: 8,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9d7bb8',
  },
});

export default SetTempBuildValueModal;