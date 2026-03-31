/**
 * OwnerIndicator
 * Renders either PlayerIcon (party mode) or simple P1/P2 badge.
 * Positioned to overlap the card for visibility.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerIcon } from '../../ui/PlayerIcon';
import { getPlayerColors } from '../../../constants/teamColors';

interface OwnerIndicatorProps {
  /** Owner player index */
  owner: number;
  /** Whether party mode is enabled */
  isPartyMode: boolean;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
}

export function OwnerIndicator({ owner, isPartyMode, playerCount }: OwnerIndicatorProps) {
  // Get player color using centralized getPlayerColors function
  const playerColor = getPlayerColors(owner, playerCount || 2).primary;

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
          backgroundColor: playerColor,
        }
      ]}>
        <Text style={[styles.ownerText, { color: '#FFFFFF', fontWeight: 'bold' }]}>P{owner + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownerBadgeContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 30,
  },
  ownerBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,  // Pill shape
  },
  ownerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default OwnerIndicator;
