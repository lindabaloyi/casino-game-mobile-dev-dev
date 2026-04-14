/**
 * GameOverButtons.tsx
 * Button logic for GameOverModal
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

import {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
} from '../../shared/config/gameOverStyles';

interface GameOverButtonsProps {
  isTournamentMode: boolean;
  shouldShowCountdown: boolean;
  shouldShowPlayAgain: boolean;
  countdown: number;
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
}

export function GameOverButtons({
  isTournamentMode,
  shouldShowCountdown,
  shouldShowPlayAgain,
  countdown,
  onPlayAgain,
  onBackToMenu,
}: GameOverButtonsProps) {
  if (isTournamentMode) {
    return (
      <View style={styles.buttons}>
        {shouldShowCountdown ? (
          <Text style={styles.countdownDisplay}>
            Next game in {countdown} seconds...
          </Text>
        ) : (
          onBackToMenu && (
            <Text style={styles.backButtonText} onPress={onBackToMenu}>
              Back to Menu
            </Text>
          )
        )}
      </View>
    );
  }

  // Non-tournament mode
  return (
    <View style={styles.buttons}>
      {shouldShowPlayAgain && onPlayAgain && (
        <View style={styles.button}>
          <Text style={styles.buttonText} onPress={onPlayAgain}>
            Play Again
          </Text>
        </View>
      )}
      {onBackToMenu && (
        <Text style={styles.backButtonText} onPress={onBackToMenu}>
          Back to Menu
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create<{
  buttons: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  backButtonText: TextStyle;
  countdownDisplay: TextStyle;
}>({
  buttons: {
    width: '100%',
    gap: 8,
    marginTop: GAME_OVER_LAYOUT.buttonMarginTop,
  },
  button: {
    paddingVertical: GAME_OVER_LAYOUT.buttonPaddingVertical,
    paddingHorizontal: GAME_OVER_LAYOUT.buttonPaddingHorizontal,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    alignItems: 'center',
    width: '100%',
    backgroundColor: GAME_OVER_COLORS.buttonBackground,
  },
  buttonText: {
    color: GAME_OVER_COLORS.buttonText,
    fontSize: GAME_OVER_SIZES.buttonTextSize,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: GAME_OVER_COLORS.backButtonText,
    fontSize: GAME_OVER_SIZES.backButtonSize,
    textAlign: 'center',
    marginTop: GAME_OVER_LAYOUT.backButtonMarginTop,
  },
  countdownDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

export default GameOverButtons;