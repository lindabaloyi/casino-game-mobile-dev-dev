/**
 * HeaderButtons Component
 * Burger menu button and notification bell for HomeScreen
 * Updated design matching the new HTML mockup
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderButtonsProps {
  onMenuPress: () => void;
  onNotificationPress: () => void;
  unreadCount: number;
}

export function HeaderButtons({ 
  onMenuPress, 
  onNotificationPress, 
  unreadCount 
}: HeaderButtonsProps) {
  const { width, height } = useWindowDimensions();
  
  // Responsive scale factor
  const scaleFactor = width < 380 ? 0.85 : width < 480 ? 0.95 : 1.0;
  
  // Responsive sizes
  const buttonSize = Math.round(44 * scaleFactor);
  const iconSize = Math.round(24 * scaleFactor);
  const badgeSize = Math.round(7 * scaleFactor);
  const topPosition = Math.max(40, Math.min(height * 0.05, 50));

  return (
    <View style={[styles.container, { top: topPosition }]}>
      {/* Burger Menu Button - 3 lines */}
      <TouchableOpacity 
        style={[styles.menuButton, { width: buttonSize, height: buttonSize }]} 
        onPress={onMenuPress}
      >
        <View style={styles.menuLines}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </View>
      </TouchableOpacity>

      {/* Right side: Profile + Notification */}
      <View style={styles.rightContainer}>
        {/* Notification Bell */}
        <TouchableOpacity 
          style={[styles.notifButton, { width: buttonSize, height: buttonSize }]} 
          onPress={onNotificationPress}
        >
          <Ionicons name="notifications" size={iconSize} color="#f5c842" />
          {unreadCount > 0 && (
            <View style={[styles.notifDot, { width: badgeSize, height: badgeSize }]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 45,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  menuButton: {
    backgroundColor: '#0f3318',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLines: {
    gap: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: '#f5c842',
    borderRadius: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifButton: {
    backgroundColor: '#0f3318',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f5c842',
    borderRadius: 3.5,
  },
});

export default HeaderButtons;
