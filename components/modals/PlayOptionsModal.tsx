/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 * 
 * Style: Green theme per casino-noir spec
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';
import { getBuildHint, canPartitionConsecutively } from '../../utils/buildCalculator';

interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  teamCapturedBuilds?: { [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[] };
  playerNumber: number;
  players?: { captures: Card[] }[];
  onConfirm: (buildValue: number, originalOwner?: number) => void;
  onCancel: () => void;
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
  const handleConfirm = (buildValue: number, originalOwner?: number) => {
    onPlayButtonSound?.();
    onConfirm(buildValue, originalOwner);
  };

  const handleCancel = () => {
    onPlayButtonSound?.();
    onCancel();
  };

  const cardValues = cards?.map(c => c.value) ?? [];
  const totalSum = cards?.reduce((sum, c) => sum + c.value, 0) ?? 0;
  
  const hint = useMemo(() => getBuildHint(cardValues), [cardValues]);
  
  const possibleBuildValues = useMemo(() => {
    const values = new Set<number>();
    for (let target = 1; target <= 10; target++) {
      if (canPartitionConsecutively(cardValues, target)) {
        values.add(target);
      }
    }
    const allSameRank = cards && cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank && cardValues[0] <= 10) {
      values.add(cardValues[0]);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [cardValues, cards]);
  
  const teamBuildOptions = useMemo(() => {
    if (!teamCapturedBuilds || playerNumber === undefined) return [];
    const myTeamBuilds = teamCapturedBuilds[playerNumber] ?? [];
    const matchingTeamBuilds = myTeamBuilds.filter(build => {
      if (!possibleBuildValues.includes(build.value)) return false;
      return true;
    });
    return matchingTeamBuilds;
  }, [teamCapturedBuilds, playerNumber, possibleBuildValues]);
  
  const matchingOptions = useMemo(() => {
    if (teamBuildOptions.length > 0) return [];
    return possibleBuildValues.filter(val => 
      (playerHand ?? []).some(card => card.value === val)
    );
  }, [possibleBuildValues, playerHand, teamBuildOptions]);

  const buildValue = (cards || []).sort((a, b) => b.value - a.value)[0]?.value ?? 0;
  const hasTotalMatch = matchingOptions.includes(totalSum);
  const hasDiffMatch = matchingOptions.includes(buildValue);

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  return (
    <ModalSurface
      visible={visible}
      theme="green"
      title="Build Options"
      subtitle="Choose a build value"
      onClose={handleCancel}
      maxWidth="md"
    >
      {/* Card fan */}
      <View style={styles.fanZone}>
        <View style={styles.cardsRow}>
          {cards.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <PlayingCard rank={card.rank} suit={card.suit} />
            </View>
          ))}
        </View>
      </View>

      {/* Value chips */}
      <View style={styles.valRow}>
        {hasTotalMatch && (
          <TouchableOpacity 
            style={[styles.vchip, totalSum === 4 && styles.vchipSel]} 
            onPress={() => handleConfirm(totalSum)}
          >
            <Text style={[styles.vchipText, totalSum === 4 && styles.vchipTextSel]}>{totalSum}</Text>
          </TouchableOpacity>
        )}
        
        {hasDiffMatch && (
          <TouchableOpacity 
            style={[styles.vchip, buildValue === 4 && styles.vchipSel, buildValue > 5 && styles.vchipRv]} 
            onPress={() => handleConfirm(buildValue)}
          >
            <Text style={[styles.vchipText, buildValue === 4 && styles.vchipTextSel, buildValue > 5 && styles.vchipTextRv]}>{buildValue}</Text>
          </TouchableOpacity>
        )}
        
        {possibleBuildValues.filter(v => v !== totalSum && v !== buildValue).slice(0, 3).map(val => (
          <TouchableOpacity 
            key={val}
            style={styles.vchip} 
            onPress={() => handleConfirm(val)}
          >
            <Text style={styles.vchipText}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team build options */}
      {teamBuildOptions.map((build, index) => (
        <TouchableOpacity 
          key={`team-${index}`}
          style={styles.btnGreen} 
          onPress={() => handleConfirm(build.value, build.originalOwner)}
        >
          <Text style={styles.btnText}>Build {build.value} (Team)</Text>
        </TouchableOpacity>
      ))}

      {!hasTotalMatch && !hasDiffMatch && teamBuildOptions.length === 0 && (
        <View style={styles.noOptions}>
          <Text style={styles.noOptionsText}>No matching cards</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btnGhost} onPress={handleCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card fan zone
  fanZone: {
    position: 'relative',
    height: 96,
    marginBottom: 16,
    paddingHorizontal: 28,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    marginHorizontal: -4,
  },

  // Value chips row
  valRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    justifyContent: 'center',
  },
  vchip: {
    minWidth: 38,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: '#2a6038',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  vchipSel: {
    backgroundColor: '#1a472a',
    borderColor: '#c8a84b',
  },
  vchipRv: {
    borderColor: '#6b1f1f',
  },
  vchipText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#c8e6c9',
  },
  vchipTextSel: {
    color: '#fde68a',
  },
  vchipTextRv: {
    color: '#fca5a5',
  },

  // Buttons
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
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#c8e6c9',
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',
  },
  noOptions: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f87171',
  },
});

export default PlayOptionsModal;
