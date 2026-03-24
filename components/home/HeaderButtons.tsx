/**
 * HeaderButtons Component
 * Burger menu button and notification bell for HomeScreen
 * Now with responsive sizing for Android devices
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
  
  // Debug logging for Android device validation
  if (__DEV__) {
    console.log('[HeaderButtons] Screen dimensions:', { width, height });
  }
  
  // Responsive calculations based on screen width
  // Scale factor: smaller screens get smaller icons, larger screens get larger icons
  const scaleFactor = width < 380 ? 0.85 : width < 480 ? 0.95 : 1.0;
  
  // Responsive icon sizes
  const menuIconSize = Math.round(26 * scaleFactor);
  const notificationIconSize = Math.round(24 * scaleFactor);
  
  // Responsive button padding
  const buttonPadding = Math.round(10 * scaleFactor);
  
  // Top positioning - use percentage-based safe area for Android
  // Use 5% of height as base, with min/max constraints
  const topPosition = Math.max(40, Math.min(height * 0.06, 60));
  
  // Responsive badge positioning
  const badgeOffset = Math.round(-4 * scaleFactor);
  const badgeSize = Math.round(20 * scaleFactor);
  const badgeFontSize = Math.round(10 * scaleFactor);
  
  if (__DEV__) {
    console.log('[HeaderButtons] Responsive values:', {
      scaleFactor,
      menuIconSize,
      notificationIconSize,
      buttonPadding,
      topPosition,
      badgeOffset,
      badgeSize,
    });
  }

  return (
    <View style={[styles.container, { top: topPosition }]}>
      {/* Burger Menu Button */}
      <TouchableOpacity 
        style={[styles.menuButton, { padding: buttonPadding }]} 
        onPress={onMenuPress}
      >
        <Ionicons name="menu" size={menuIconSize} color="white" />
      </TouchableOpacity>

      {/* Notification Bell */}
      <TouchableOpacity 
        style={[styles.notificationButton, { padding: buttonPadding }]} 
        onPress={onNotificationPress}
      >
        <Ionicons name="notifications" size={notificationIconSize} color="white" />
        {unreadCount > 0 && (
          <View style={[
            styles.notificationBadge, 
            { 
              top: badgeOffset, 
              right: badgeOffset,
              minWidth: badgeSize,
              height: badgeSize,
            }
          ]}>
            <Ionicons 
              name={unreadCount > 9 ? "notifications" : undefined}
              size={badgeFontSize}
              color="white"
            >
              {unreadCount > 9 ? undefined : unreadCount}
            </Ionicons>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  notificationButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});

export default HeaderButtons;
