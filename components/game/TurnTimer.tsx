/**
 * TurnTimer
 * Visual countdown timer displayed in the game status bar.
 * Shows remaining time with color feedback when running low.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TURN_TIMER_DURATION, LOW_TIME_THRESHOLD } from '../../hooks/game/useTurnTimer';

interface TurnTimerProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether the timer should show (only for active player's turn) */
  visible?: boolean;
  /** Whether time is running low (≤5 seconds) */
  isLowTime?: boolean;
}

export function TurnTimer({ 
  timeRemaining, 
  visible = true,
  isLowTime = false,
}: TurnTimerProps) {
  if (!visible) {
    return null;
  }
  
  // Determine color based on time remaining
  const getTimerColor = () => {
    if (timeRemaining === 0) {
      return '#F44336'; // Red - timeout
    }
    if (timeRemaining <= LOW_TIME_THRESHOLD) {
      return '#FF9800'; // Orange - warning
    }
    return '#FFFFFF'; // White - normal
  };
  
  // Get background color
  const getBackgroundColor = () => {
    if (timeRemaining === 0) {
      return '#D32F2F'; // Dark red
    }
    if (timeRemaining <= LOW_TIME_THRESHOLD) {
      return '#F57C00'; // Dark orange
    }
    return 'rgba(255, 255, 255, 0.2)'; // Transparent white
  };
  
  // Calculate progress percentage
  const progressPercent = (timeRemaining / TURN_TIMER_DURATION) * 100;
  
  return (
    <View style={styles.container}>
      <View style={[styles.timerBadge, { backgroundColor: getBackgroundColor() }]}>
        <Text style={[styles.timerText, { color: getTimerColor() }]}>
          {timeRemaining}s
        </Text>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progressPercent}%`,
                backgroundColor: getTimerColor(),
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default TurnTimer;
