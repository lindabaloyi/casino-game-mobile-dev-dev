/**
 * PlayerIcon Component
 * Displays a player indicator with team colors for party mode
 * 
 * - Team A players (0, 1): Sky Blue theme (#0284c7)
 * - Team B players (1, 3): Amber theme (#c2410c)
 * - Shows player position (P1, P2) within their team
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTeamFromIndex, getPlayerPositionLabel, getPlayerTag } from '../../shared/game/team';
import { getTeamColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors } from '../../constants/teamColors';

// White color for text and border
const WHITE = '#FFFFFF';

// Team ID type
type TeamId = 'A' | 'B';

interface PlayerIconProps {
  /** Player index (0-3) */
  playerIndex: number;
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom styles to override defaults */
  style?: object;
}

/**
 * Get team colors based on player index
 */
function getPlayerTeamColors(playerIndex: number): TeamColors {
  const team = getTeamFromIndex(playerIndex) as TeamId;
  return getTeamColors(team);
}

/**
 * PlayerIcon - displays a styled player badge with team colors
 * 
 * Team A (players 0, 1): Sky Blue theme (#0284c7)
 * Team B (players 1, 3): Amber theme (#c2410c)
 */
export function PlayerIcon({ 
  playerIndex, 
  size = 'medium',
  style 
}: PlayerIconProps) {
  const colors = useMemo(() => getPlayerTeamColors(playerIndex), [playerIndex]);
  const position = useMemo(() => getPlayerPositionLabel(playerIndex), [playerIndex]);
  
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          text: styles.textSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          text: styles.textLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          text: styles.textMedium,
        };
    }
  }, [size]);
  
  return (
    <View 
      style={[
        styles.container, 
        sizeStyles.container,
        { 
          backgroundColor: colors.primary,
        },
        style
      ]}
    >
      <Text style={[styles.text, sizeStyles.text, { color: WHITE, fontWeight: 'bold' }]}>
        {position}
      </Text>
    </View>
  );
}

/**
 * Compact player icon - just shows the position badge
 */
export function PlayerBadge({ playerIndex }: { playerIndex: number }) {
  const colors = useMemo(() => getPlayerTeamColors(playerIndex), [playerIndex]);
  const position = useMemo(() => getPlayerPositionLabel(playerIndex), [playerIndex]);
  
  return (
    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
      <Text style={[styles.badgeText, { fontWeight: 'bold' }]}>{position}</Text>
    </View>
  );
}

/**
 * Player icon with team indicator (friendly vs enemy)
 * Note: This component is kept for compatibility but uses the new styling
 */
export function TeamPlayerIcon({ 
  playerIndex, 
  isFriendly 
}: { 
  playerIndex: number; 
  isFriendly: boolean;
}) {
  const colors = useMemo(() => {
    const team = getTeamFromIndex(playerIndex) as TeamId;
    return getTeamColors(team);
  }, [playerIndex]);
  
  const position = useMemo(() => getPlayerPositionLabel(playerIndex), [playerIndex]);
  
  return (
    <View style={[styles.teamContainer, { borderColor: colors.primary }]}>
      <View style={[styles.teamBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.teamText, { color: WHITE, fontWeight: 'bold' }]}>{position}</Text>
      </View>
      <Text style={[styles.teamLabel, { color: colors.text }]}>
        {isFriendly ? 'Friendly' : 'Enemy'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,  // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  containerMedium: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  containerLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 20,
  },
  subtext: {
    fontWeight: 'bold',
  },
  subtextSmall: {
    fontSize: 6,
  },
  subtextMedium: {
    fontSize: 8,
  },
  subtextLarge: {
    fontSize: 10,
  },
  // Badge styles (compact) - Pill shape
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,  // Pill shape
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Team container styles
  teamContainer: {
    borderWidth: 0,
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  teamBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,  // Pill shape
  },
  teamText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamLabel: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: 'bold',
  },
});

export default PlayerIcon;
