/**
 * SetTempBuildValueModal
 * Modal for setting the base value on a temp stack (dual build).
 * 
 * Style: Purple theme with pulsing confirm button.
 * Layout matches StealBuildModal exactly.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ModalSurface } from './ModalSurface';
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
  /** Total player count */
  playerCount?: number;
  /** Whether party mode is enabled */
  isPartyMode?: boolean;
  /** Available target values (typically 1-10) */
  availableValues?: number[];
  onConfirm: (value: number) => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

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
  // Pulsing glow animation on the confirm button
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Track selected value
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    
    // Reset selected value when modal opens
    setSelectedValue(null);
    
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
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

  // Display the current temp stack cards
  const stackCards = tempStack?.cards || [];
  const currentValue = tempStack?.value || 0;

  return (
    <ModalSurface
      visible={visible}
      theme="purple"
      title="Set Build Value"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card row - showing temp stack cards */}
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

      {/* Current value display */}
      <Text style={styles.currentValueText}>
        Current combined value: {currentValue}
      </Text>

      {/* Value selection buttons */}
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

      {/* Confirm — pulsing glow (only enabled when value selected) */}
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

      {/* Cancel */}
      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card row
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },

  // Current value text
  currentValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',   // Gold matching modal theme
    marginBottom: 12,
    textAlign: 'center',
  },
  
  // Select prompt
  selectPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
    marginBottom: 10,
    textAlign: 'center',
  },

  // Values grid
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  
  // Value selection button
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

  // Pulsing glow wrapper
  glowWrapper: {
    width: '100%',
    marginBottom: 7,
    // Shadow for the glow effect (iOS)
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    // Android elevation keeps it subtle
    elevation: 8,
    borderRadius: 13,
  },

  // Dynamic confirm button — purple theme
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

  // Cancel ghost button
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9d7bb8',
  },
});

export default SetTempBuildValueModal;
