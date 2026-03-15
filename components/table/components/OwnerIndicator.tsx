/**
 * OwnerIndicator
 * Renders either PlayerIcon (party mode) or simple P1/P2 badge.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerIcon } from '../../ui/PlayerIcon';
import { useBuildTeamInfo, PLAYER_1_GOLD, PLAYER_2_PURPLE } from '../hooks/useBuildTeamInfo';

interface OwnerIndicatorProps {
  /** Owner player index */
  owner: number;
  /** Whether party mode is enabled */
  isPartyMode: boolean;
}

export function OwnerIndicator({ owner, isPartyMode }: OwnerIndicatorProps) {
  // Use the hook to get colors
  const { colors } = useBuildTeamInfo({
    owner,
    isPartyMode,
    isExtending: false,
    effectiveSum: 0,
  });

  if (isPartyMode) {
    return (
      <View style={styles.ownerBadgeContainer}>
        <PlayerIcon 
          playerIndex={owner} 
          size="small" 
        />
      </View>
    );
  }

  return (
    <View style={styles.ownerBadgeContainer}>
      <View style={[
        styles.ownerBadge, 
        { 
          backgroundColor: owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }
      ]}>
        <Text style={[styles.ownerText, { color: '#FFFFFF' }]}>P{owner + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownerBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
  },
  ownerBadge: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ownerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default OwnerIndicator;
