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
import { getBuildHint, canPartitionConsecutively } from '../../utils/buildCalculator';

interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  teamCapturedBuilds?: { [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[] };
  playerNumber: number;
  // Players array for capture validation - needed to check if teammate has captures
  players?: { captures: Card[] }[];
  onConfirm: (buildValue: number, originalOwner?: number) => void;
  onCancel: () => void;
  /** Optional callback for button click sound */
  onPlayButtonSound?: () => void;
}

export function PlayOptionsModal({
  visible,
  cards,
  playerHand,
  teamCapturedBuilds,
  playerNumber,
  players,
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: PlayOptionsModalProps) {
  // Handle confirm with optional sound
  const handleConfirm = (buildValue: number, originalOwner?: number) => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onConfirm(buildValue, originalOwner);
  };

  // Handle cancel with optional sound
  const handleCancel = () => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onCancel();
  };
  // Calculate card values first (for use in hooks)
  const cardValues = cards?.map(c => c.value) ?? [];
  const totalSum = cards?.reduce((sum, c) => sum + c.value, 0) ?? 0;
  
  // Get the hint for the current stack (what's needed to complete)
  const hint = useMemo(() => getBuildHint(cardValues), [cardValues]);
  
  // Calculate all possible build values from the cards
  // Uses the new canPartitionConsecutively function which enforces non-increasing order within each group
  const possibleBuildValues = useMemo(() => {
    const values = new Set<number>();
    
    // Use the new order-enforcing partition checker for all potential targets 1-10
    for (let target = 1; target <= 10; target++) {
      if (canPartitionConsecutively(cardValues, target)) {
        values.add(target);
      }
    }
    
    // Also check for single card values (same rank builds)
    const allSameRank = cards && cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank && cardValues[0] <= 10) {
      values.add(cardValues[0]);
    }
    
    console.log(`[PlayOptionsModal] Possible build values for ${JSON.stringify(cardValues)}:`, Array.from(values));
    
    return Array.from(values).sort((a, b) => a - b);
  }, [cardValues, cards]);
  
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
  
  // Get team captured builds (for party mode 2v2 cooperative rebuild)
  // Uses player-specific builds: teamCapturedBuilds[playerNumber] = builds THIS PLAYER can rebuild
  // SIMPLIFIED: Trust the teamCapturedBuilds list - just filter by possible values and add guardrails
  const teamBuildOptions = useMemo(() => {
    
    if (!teamCapturedBuilds || playerNumber === undefined) {
      return [];
    }
    
    // Get builds that THIS PLAYER can rebuild (player-specific, not team-shared)
    const myTeamBuilds = teamCapturedBuilds[playerNumber] ?? [];
    
    // Simple filtering: match possible build values
    // Trust the teamCapturedBuilds list as the source of truth
    const matchingTeamBuilds = myTeamBuilds.filter(build => {
      // Must match value - player must have card to play
      if (!possibleBuildValues.includes(build.value)) return false;
      
      return true;
    });
    
    console.log(`[PlayOptionsModal] Player ${playerNumber} team build options:`, matchingTeamBuilds);
    
    return matchingTeamBuilds;
  }, [teamCapturedBuilds, playerNumber, possibleBuildValues]);
  
  // Check which build values have matching cards in hand
  const matchingOptions = useMemo(() => {
    // If team build options exist, DON'T show own options - team builds take priority
    if (teamBuildOptions.length > 0) {
      return [];
    }
    
    return possibleBuildValues.filter(val => 
      (playerHand ?? []).some(card => card.value === val)
    );
  }, [possibleBuildValues, playerHand, teamBuildOptions]);
  
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
          <Text style={styles.subtitle}>Choose a build value</Text>
          
          {/* Cards Section - only cards displayed, no jargon */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsRow}>
              {cards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
              <Text style={styles.plusSign}>+</Text>
            </View>
          </View>
          
          {/* Options */}
          <View style={styles.optionsSection}>
            {hasTotalMatch && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => handleConfirm(totalSum)}
              >
                <Text style={styles.optionText}>Build {totalSum}</Text>
              </TouchableOpacity>
            )}
            
            {hasDiffMatch && (
              <TouchableOpacity 
                style={[styles.optionButton, styles.diffOption]} 
                onPress={() => handleConfirm(buildValue)}
              >
                <Text style={styles.optionText}>Build {buildValue}</Text>
              </TouchableOpacity>
            )}
            
            {hasSingleMatch && singleValue !== totalSum && singleValue !== buildValue && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => handleConfirm(singleValue!)}
              >
                <Text style={styles.optionText}>Build {singleValue}</Text>
              </TouchableOpacity>
            )}
            
            {/* Team Build Options - for party mode cooperative rebuild */}
            {teamBuildOptions.map((build, index) => (
              <TouchableOpacity 
                key={`team-${index}`}
                style={[styles.optionButton, styles.teamOption]} 
                onPress={() => handleConfirm(build.value, build.originalOwner)}
              >
                <Text style={styles.optionText}>Build {build.value} (Team)</Text>
              </TouchableOpacity>
            ))}
            
            {!hasTotalMatch && !hasDiffMatch && !hasSingleMatch && teamBuildOptions.length === 0 && (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No matching cards</Text>
              </View>
            )}
          </View>
          
          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
  teamOption: {
    backgroundColor: '#0891b2',
    borderColor: '#22d3ee',
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
