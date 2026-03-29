/**
 * CornerTimer
 * Non-intrusive timer displayed in the top-right corner of the game board.
 * Shows remaining time with subtle color feedback when running low.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TURN_TIMER_DURATION, LOW_TIME_THRESHOLD } from '../../hooks/game/useTurnTimer';

interface CornerTimerProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Whether the timer should show (only for active player's turn) */
  visible?: boolean;
  /** Whether time is running low (≤5 seconds) */
  isLowTime?: boolean;
}

export function CornerTimer({ 
  timeRemaining, 
  visible = true,
  isLowTime = false,
}: CornerTimerProps) {
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
  
  // Get background color - more subtle
  const getBackgroundColor = () => {
    if (timeRemaining === 0) {
      return 'rgba(244, 67, 54, 0.3)'; // Dark red
    }
    if (timeRemaining <= LOW_TIME_THRESHOLD) {
      return 'rgba(255, 152, 0, 0.3)'; // Dark orange
    }
    return 'rgba(255, 255, 255, 0.15)'; // Transparent white - subtle
  };
  
  // Calculate progress percentage
  const progressPercent = (timeRemaining / TURN_TIMER_DURATION) * 100;
  
  return (
    <View style={styles.container}>
      <View style={[styles.timerBadge, { backgroundColor: getBackgroundColor() }]}>
        <Text style={[styles.timerText, { color: getTimerColor() }]}>
          {timeRemaining}s
        </Text>
        {/* Progress bar - thin and subtle */}
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
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 100,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 1,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});

export default CornerTimer;
