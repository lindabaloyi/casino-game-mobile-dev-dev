/**
 * TurnStatusIndicator
 * Shows the current turn status in a subtle way integrated on the game board.
 * Displays "Your Turn" or "P{n}" based on whose turn it is.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTeamFromIndex } from '../../shared/game/team';
import { getTeamColors, getPlayerColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors } from '../../constants/teamColors';

interface TurnStatusIndicatorProps {
  /** Current player index (the one whose turn it is) */
  currentPlayer: number;
  /** This player's index (the local player) */
  playerNumber: number;
  /** Total player count (2 or 4) */
  playerCount: number;
  /** Whether party mode is enabled */
  isPartyMode?: boolean;
}

export function TurnStatusIndicator({
  currentPlayer,
  playerNumber,
  playerCount,
  isPartyMode = false,
}: TurnStatusIndicatorProps) {
  const { text, backgroundColor, textColor } = useMemo(() => {
    const isMyTurn = currentPlayer === playerNumber;
    let colors: TeamColors;
    let turnText: string;
    
    if (isPartyMode) {
      // Party mode: use team colors
      const team = getTeamFromIndex(currentPlayer) as 'A' | 'B';
      colors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else {
      // Non-party: use player colors
      colors = getPlayerColors(currentPlayer);
    }
    
    if (isMyTurn) {
      turnText = 'Your Turn';
    } else {
      turnText = `P${currentPlayer + 1}`;
    }
    
    return {
      text: turnText,
      backgroundColor: colors.primary,
      textColor: '#FFFFFF',
    };
  }, [currentPlayer, playerNumber, isPartyMode]);

  // Don't show for non-active turns in multiplayer (optional - can toggle)
  // For now, always show to give clear feedback
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 100,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TurnStatusIndicator;
