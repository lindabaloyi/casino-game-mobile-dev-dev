/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 * 
 * Style: Green/orange casino theme
 * Shows: Combined card preview with + indicator for card being added
 */

import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';
import { getBuildHint } from '../../utils/buildCalculator';

interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  onConfirm: (buildValue: number) => void;
  onCancel: () => void;
}

export function PlayOptionsModal({
  visible,
  cards,
  playerHand,
  onConfirm,
  onCancel,
}: PlayOptionsModalProps) {
  // Calculate card values first (for use in hooks)
  const cardValues = cards?.map(c => c.value) ?? [];
  const totalSum = cards?.reduce((sum, c) => sum + c.value, 0) ?? 0;
  
  // Get the hint for the current stack (what's needed to complete)
  const hint = useMemo(() => getBuildHint(cardValues), [cardValues]);
  
  // Calculate all possible build values from the cards
  const possibleBuildValues = useMemo(() => {
    const values = new Set<number>();
    
    // Add total sum if <= 10 (sum build)
    if (totalSum <= 10) {
      values.add(totalSum);
    }
    
    // Add hint value if complete (need === 0)
    if (hint && hint.need === 0) {
      values.add(hint.value);
    }
    
    // Add the "need" value if there's an incomplete build
    if (hint && hint.need > 0) {
      values.add(hint.value);  // The target value
      values.add(hint.need);  // The card value needed
    }
    
    // Also check for single card values (same rank builds)
    const allSameRank = cards && cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank && cardValues[0] <= 10) {
      values.add(cardValues[0]);
    }
    
    return Array.from(values).sort((a, b) => a - b);
  }, [cardValues, hint, cards, totalSum]);
  
  // Determine the primary build display info
  const buildInfo = useMemo(() => {
    if (hint) {
      if (hint.need === 0) {
        return { 
          display: `Complete: ${hint.value}`, 
          subDisplay: `All cards form valid build(s)`,
          isComplete: true 
        };
      } else {
        return { 
          display: `Build ${hint.value}`, 
          subDisplay: `Need ${hint.need} to complete`,
          isComplete: false 
        };
      }
    }
    
    // Fallback to simple calculation
    if (totalSum <= 10) {
      return { 
        display: `Total: ${totalSum}`, 
        subDisplay: `Sum build`,
        isComplete: true 
      };
    }
    
    // Diff build fallback
    const sorted = [...(cards || [])].sort((a, b) => b.value - a.value);
    const buildValue = sorted[0]?.value ?? 0;
    return { 
      display: `Base: ${buildValue}`, 
      subDisplay: `Need ${totalSum - buildValue}`,
      isComplete: false 
    };
  }, [hint, totalSum, cards]);
  
  // Check which build values have matching cards in hand
  const matchingOptions = useMemo(() => {
    return possibleBuildValues.filter(val => 
      (playerHand ?? []).some(card => card.value === val)
    );
  }, [possibleBuildValues, playerHand]);
  
  // Determine build type for display
  const buildType = totalSum <= 10 ? 'sum' : 'diff';
  const sortedCards = [...(cards || [])].sort((a, b) => b.value - a.value);
  const buildValue = sortedCards[0]?.value ?? 0;
  
  // Handle undefined cards gracefully - render nothing if no valid cards
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }
  
  // Determine match status for UI
  const hasTotalMatch = matchingOptions.includes(totalSum);
  const hasDiffMatch = matchingOptions.includes(buildValue);
  const hasSingleMatch = (() => {
    const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    const singleValue = allSameRank ? cards[0].value : null;
    return singleValue !== null && matchingOptions.includes(singleValue);
  })();
  const singleValue = (() => {
    const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    return allSameRank ? cards[0].value : null;
  })();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.clickOutside} 
          activeOpacity={1} 
          onPress={onCancel}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <Text style={styles.title}>Build Options</Text>
          
          {/* Description */}
          <Text style={styles.subtitle}>Use stack to build the following:</Text>
          
          {/* Combined card preview */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsRow}>
              {cards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
              <Text style={styles.plusSign}>+</Text>
            </View>
            <Text style={styles.buildValue}>
              {buildType === 'sum' 
                ? `Total: ${totalSum}` 
                : `Base: ${buildValue} (need ${totalSum - buildValue})`}
            </Text>
          </View>
          
          {/* Options */}
          <View style={styles.optionsSection}>
            {hasTotalMatch && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => onConfirm(totalSum)}
              >
                <Text style={styles.optionText}>Build {totalSum} (sum)</Text>
              </TouchableOpacity>
            )}
            
            {hasDiffMatch && (
              <TouchableOpacity 
                style={[styles.optionButton, styles.diffOption]} 
                onPress={() => onConfirm(buildValue)}
              >
                <Text style={styles.optionText}>Build {buildValue} (base)</Text>
              </TouchableOpacity>
            )}
            
            {hasSingleMatch && singleValue !== totalSum && singleValue !== buildValue && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => onConfirm(singleValue!)}
              >
                <Text style={styles.optionText}>Build {singleValue}</Text>
              </TouchableOpacity>
            )}
            
            {!hasTotalMatch && !hasDiffMatch && !hasSingleMatch && (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No matching cards</Text>
              </View>
            )}
          </View>
          
          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  clickOutside: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#28a745',
    padding: 16,
    width: '75%',
    maxWidth: 260,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardsSection: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  cardWrapper: {
    marginHorizontal: -4,
  },
  plusSign: {
    fontSize: 20,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  buildValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  optionsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#34d058',
    width: '100%',
    alignItems: 'center',
  },
  diffOption: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  optionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  noOptions: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#f87171',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});

export default PlayOptionsModal;
