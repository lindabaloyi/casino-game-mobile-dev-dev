/**
 * useNotification
 * 
 * Manages notification banner state with slide-in animation.
 * Provides show/clear functionality with automatic hide timing.
 */

import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export interface UseNotificationResult {
  /** Current notification message */
  notification: string | null;
  /** Animated value for slide animation */
  animValue: Animated.Value;
  /** Show a notification message */
  showNotification: (message: string) => void;
  /** Clear the current notification */
  clearNotification: () => void;
}

export function useNotification(): UseNotificationResult {
  const [notification, setNotification] = useState<string | null>(null);
  const animValue = useRef(new Animated.Value(-100)).current;

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    Animated.timing(animValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      Animated.timing(animValue, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2500);
  }, [animValue]);

  const clearNotification = useCallback(() => {
    setNotification(null);
    Animated.timing(animValue, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  return {
    notification,
    animValue,
    showNotification,
    clearNotification,
  };
}

export default useNotification;
