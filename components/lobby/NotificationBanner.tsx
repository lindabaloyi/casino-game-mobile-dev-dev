/**
 * NotificationBanner
 * 
 * Animated notification banner that slides in from top.
 * Uses the animated value from useNotification hook.
 */

import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface NotificationBannerProps {
  message: string | null;
  animValue: Animated.Value;
}

export function NotificationBanner({ message, animValue }: NotificationBannerProps) {
  if (!message) return null;

  return (
    <Animated.View 
      style={[
        styles.banner,
        { transform: [{ translateY: animValue }] }
      ]}
    >
      <Ionicons name="person-add" size={20} color="white" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationBanner;
