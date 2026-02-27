/**
 * PlayConfirmationModal
 * Modal shown when player clicks Accept on a temp stack.
 * Displays all available options (build vs capture) for player to choose.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { PlayOption } from '../../utils/buildUtils';
import { Card } from './types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed/cancelled */
  onClose: () => void;
  /** Available play options (build and capture) */
  options: PlayOption[];
  /** Cards in the temp stack */
  stackCards: Card[];
  /** Callback when player selects an option */
  onSelectOption: (option: PlayOption) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlayConfirmationModal({
  visible,
  onClose,
  options,
  stackCards,
  onSelectOption,
}: Props) {
  // Separate options by type for display
  const buildOptions = options.filter(o => o.type === 'build');
  const captureOptions = options.filter(o => o.type === 'capture');

  const handleSelect = (option: PlayOption) => {
    onSelectOption(option);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <Text style={styles.title}>Choose Action</Text>
          
          {/* Stack Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Stack:</Text>
            <View style={styles.cardRow}>
              {stackCards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Build Options */}
            {buildOptions.length > 0 && (
              <View style={styles.optionGroup}>
                <Text style={styles.groupLabel}>BUILD</Text>
                {buildOptions.map((option, index) => (
                  <TouchableOpacity
                    key={`build-${index}`}
                    style={[styles.optionButton, styles.buildButton]}
                    onPress={() => handleSelect(option)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    {option.buildType && (
                      <Text style={styles.optionSubtext}>
                        {option.buildType.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Capture Options */}
            {captureOptions.length > 0 && (
              <View style={styles.optionGroup}>
                <Text style={styles.groupLabel}>CAPTURE</Text>
                {captureOptions.map((option, index) => (
                  <TouchableOpacity
                    key={`capture-${index}`}
                    style={[styles.optionButton, styles.captureButton]}
                    onPress={() => handleSelect(option)}
                  >
                    <View style={styles.captureContent}>
                      <Text style={styles.optionText}>{option.label}</Text>
                      {option.card && (
                        <View style={styles.captureCardPreview}>
                          <PlayingCard 
                            rank={option.card.rank} 
                            suit={option.card.suit}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardWrapper: {
    // Cards are already sized by PlayingCard component
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionGroup: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
    marginBottom: 4,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  captureButton: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
  },
  captureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  captureCardPreview: {
    // Scaled down card preview
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default PlayConfirmationModal;
