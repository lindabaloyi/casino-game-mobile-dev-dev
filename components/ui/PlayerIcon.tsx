/**
 * PlayerIcon Component
 * Displays a player indicator with team colors for party mode
 * 
 * - Team A players (0, 1): Orange/Gold theme (#FF9800)
 * - Team B players (2, 3): Blue/Purple theme (#4DABF7)
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
 * Team A (players 0, 1): Orange/Gold theme (#FF9800)
 * Team B (players 2, 3): Blue/Purple theme (#4DABF7)
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
          borderColor: WHITE,
        },
        style
      ]}
    >
      <Text style={[styles.text, sizeStyles.text, { color: WHITE }]}>
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
      <Text style={styles.badgeText}>{position}</Text>
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
      <View style={[styles.teamBadge, { backgroundColor: colors.primary, borderColor: WHITE }]}>
        <Text style={[styles.teamText, { color: WHITE }]}>{position}</Text>
      </View>
      <Text style={[styles.teamLabel, { color: colors.text }]}>
        {isFriendly ? 'Friendly' : 'Enemy'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  containerSmall: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  containerMedium: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  containerLarge: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    fontWeight: 'normal',
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
  // Badge styles (compact)
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Team container styles
  teamContainer: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  teamBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: WHITE,
  },
  teamText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  teamLabel: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: '600',
  },
});

export default PlayerIcon;
